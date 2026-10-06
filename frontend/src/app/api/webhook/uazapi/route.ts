// Webhook Uazapi: valida origem, persiste eventos e delega processamento pesado ao after().
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { allowRequest } from "@/lib/rate-limit";
import { shouldUseAutomaticPreAttendance, uazapiChatAvatar, uazapiMediaUrl, uazapiMessageContent, uazapiMessageType } from "@/lib/uazapi-sync";
import { analyzeSentiment, generatePreAttendance } from "@/services/ai";
import { isAiConfigured } from "@/services/ai/client";
import { downloadUazapiMessage, normalizePhone, sendText, type UazapiConfig } from "@/services/uazapi";
import { transcribeAudio } from "@/services/whisper";

const payloadSchema = z.object({
  event: z.string().optional(),
  EventType: z.string().optional(),
  token: z.string().optional(),
  message: z.record(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough().refine((payload) => Boolean(payload.event || payload.EventType), { message: "Evento ausente." });
const asString = (value: unknown) => typeof value === "string" ? value : undefined;

async function configuredOwner(token?: string) {
  if (token) {
    const linked = await prisma.user.findFirst({ where: { uazapiToken: token }, select: { id: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true } });
    if (linked) return linked;
  }
  const email = process.env.UAZAPI_OWNER_EMAIL?.trim().toLowerCase();
  if (!email) return null;
  const owner = await prisma.user.findUnique({ where: { email }, select: { id: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true } });
  if (!owner?.active || !owner.crmEnabled) throw new Error(`Responsável da Uazapi indisponível: ${email}`);
  return owner;
}

async function processReceived(message: Record<string, unknown>, instanceToken?: string) {
  if (message.isGroup === true) return;
  if (String(message.messageType ?? message.type ?? "").toLowerCase() === "call") return;
  const fromMe = message.fromMe === true;
  const chatId = asString(message.chatid) ?? asString(message.chatId) ?? asString(message.phone) ?? asString(message.sender);
  if (!chatId || chatId.endsWith("@lid")) return;
  const phone = normalizePhone(chatId.split("@")[0]);
  const content = uazapiMessageContent(message);
  const type = uazapiMessageType(message.messageType ?? message.type);
  const externalId = asString(message.messageid) ?? asString(message.id);
  const displayName = fromMe ? `WhatsApp ${phone.slice(-4)}` : asString(message.pushName) ?? asString(message.senderName) ?? `WhatsApp ${phone.slice(-4)}`;
  const avatarUrl = uazapiChatAvatar(message);

  const owner = await configuredOwner(instanceToken);
  if (!owner) throw new Error("Responsável da Uazapi não configurado.");
  const config: UazapiConfig | undefined = owner.uazapiToken && owner.uazapiBaseUrl ? { baseUrl: owner.uazapiBaseUrl, token: owner.uazapiToken } : undefined;
  const ownerData = owner ? { userId: owner.id } : {};
  const lead = await prisma.lead.upsert({
    where: { phone },
    update: { lastActivityAt: new Date(), ...(avatarUrl ? { avatarUrl } : {}), ...ownerData },
    create: { name: displayName, phone, avatarUrl, stage: "NOVO", source: "WHATSAPP", lastActivityAt: new Date(), ...ownerData },
  });
  const mediaUrl = externalId ? uazapiMediaUrl(message, lead.id) : null;
  let conversation = await prisma.conversation.findFirst({ where: { leadId: lead.id, status: { not: "ENCERRADO" } }, orderBy: { updatedAt: "desc" } });
  if (!conversation) conversation = await prisma.conversation.create({ data: { leadId: lead.id, uazapiChatId: chatId } });
  const previousCount = await prisma.message.count({ where: { conversationId: conversation.id } });
  const preAttendanceRule = await prisma.automationRule.findUnique({ where: { id: "pre-attendance" }, select: { active: true } });
  if (externalId) {
    const duplicate = await prisma.activity.findFirst({ where: { leadId: lead.id, type: "uazapi_message", detail: { contains: externalId } } });
    if (duplicate) return;
  }
  let transcription: string | null = null;
  if (type === "AUDIO" && externalId) {
    const downloaded = await downloadUazapiMessage(externalId, config).catch(() => null);
    const audioUrl = downloaded && typeof downloaded.fileURL === "string" ? downloaded.fileURL : null;
    if (audioUrl) {
      try {
        transcription = await transcribeAudio(audioUrl);
      } catch (error) {
        await prisma.errorLog.create({
          data: {
            source: "audio-transcription",
            message: error instanceof Error ? error.message : "Falha desconhecida na transcrição.",
            context: { leadId: lead.id, externalId },
          },
        }).catch(() => undefined);
      }
    }
  }
  const savedMessage = await prisma.message.create({ data: { conversationId: conversation.id, sender: fromMe ? "CORRETOR" : "LEAD", userId: fromMe ? owner?.id : null, content: content || transcription || `[${type.toLowerCase()} recebido]`, type, mediaUrl, transcription } });
  const notification = {
    type: "NEW_MESSAGE",
    title: "Nova mensagem no WhatsApp",
    body: `${lead.name}: ${(content || transcription || `[${type.toLowerCase()}]`).slice(0, 180)}`,
    href: "/inbox",
    sourceKey: `message:${externalId || savedMessage.id}`,
  };
  if (!fromMe) {
    if (lead.userId) await createNotification({ ...notification, userId: lead.userId });
    else await notifyAdmins(notification);
  }
  if (externalId) await prisma.activity.create({ data: { leadId: lead.id, type: "uazapi_message", detail: JSON.stringify({ externalId, messageId: savedMessage.id }) } });
  const analyzedText = transcription || content;
  if (!fromMe && analyzedText && isAiConfigured()) {
    const sentiment = await analyzeSentiment(analyzedText).catch(() => null);
    if (sentiment) await prisma.conversation.update({ where: { id: conversation.id }, data: { sentiment: sentiment.sentiment } });
  }
  if (shouldUseAutomaticPreAttendance(fromMe, previousCount, preAttendanceRule?.active === true)) {
    try {
      if (analyzedText && isAiConfigured() && process.env.UAZAPI_TOKEN) {
        const reply = await generatePreAttendance({ leadPhone: phone, firstMessage: analyzedText });
        const sent = await sendText(phone, reply, config);
        const replyMessage = await prisma.message.create({ data: { conversationId: conversation.id, sender: "BOT", content: reply } });
        const replyExternalId = typeof sent.messageid === "string" ? sent.messageid : typeof sent.id === "string" ? sent.id : null;
        if (replyExternalId) await prisma.activity.create({ data: { leadId: lead.id, type: "uazapi_message", detail: JSON.stringify({ externalId: replyExternalId, messageId: replyMessage.id }) } });
      }
    } finally {
      await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "HUMANO" } });
    }
  }
}

async function processUpdate(message: Record<string, unknown>) {
  const externalId = asString(message.messageid) ?? asString(message.id); if (!externalId) return;
  const reference = await prisma.activity.findFirst({ where: { type: "uazapi_message", detail: { contains: externalId } }, orderBy: { createdAt: "desc" } });
  if (!reference) return;
  const parsed = JSON.parse(reference.detail) as { messageId?: string }; if (!parsed.messageId) return;
  const status = (asString(message.status) ?? "").toLowerCase();
  await prisma.message.update({ where: { id: parsed.messageId }, data: status.includes("read") ? { readAt: new Date(), deliveredAt: new Date() } : status.includes("deliver") ? { deliveredAt: new Date() } : {} });
}

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const headerAuthorized = Boolean(process.env.UAZAPI_WEBHOOK_SECRET) && request.headers.get("x-webhook-secret") === process.env.UAZAPI_WEBHOOK_SECRET;
  const instanceAuthorized = Boolean(process.env.UAZAPI_TOKEN) && parsed.data.token === process.env.UAZAPI_TOKEN;
  if (!headerAuthorized && !instanceAuthorized) return new NextResponse("Unauthorized", { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!(await allowRequest(`uazapi:${ip}`, 120))) return new NextResponse("Too Many Requests", { status: 429 });
  const message = parsed.data.message ?? parsed.data.data ?? {}; const event = (parsed.data.event ?? parsed.data.EventType ?? "").toLowerCase();
  after(async () => { try { if (["messages", "message.received"].includes(event)) await processReceived(message, parsed.data.token); else if (["messages_update", "message.delivered", "message.read"].includes(event)) await processUpdate(message); } catch (error) { const text=error instanceof Error?error.message:"Falha desconhecida";await prisma.errorLog.create({data:{source:"webhook",message:text,stack:error instanceof Error?error.stack:undefined,context:{event}}}).catch(()=>undefined);console.error("Falha no processamento do webhook", error instanceof Error ? { name: error.name, message: error.message } : { type: typeof error }); } });
  return NextResponse.json({ ok: true });
}
