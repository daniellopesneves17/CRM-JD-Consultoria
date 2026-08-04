// Webhook Uazapi: valida origem, persiste eventos e delega processamento pesado ao after().
import { MessageType } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rate-limit";
import { analyzeSentiment, generatePreAttendance, generateWhatsAppReply } from "@/services/ai";
import { normalizePhone, sendText } from "@/services/uazapi";
import { transcribeAudio } from "@/services/whisper";

const payloadSchema = z.object({ event: z.string(), message: z.record(z.unknown()).optional(), data: z.record(z.unknown()).optional() }).passthrough();
const asString = (value: unknown) => typeof value === "string" ? value : undefined;

function messageType(raw?: string): MessageType {
  const value = raw?.toLowerCase() ?? "";
  if (value.includes("audio")) return "AUDIO"; if (value.includes("image")) return "IMAGE"; if (value.includes("document")) return "DOCUMENT"; return "TEXT";
}

async function processReceived(message: Record<string, unknown>) {
  if (message.fromMe === true || message.isGroup === true) return;
  const chatId = asString(message.chatid) ?? asString(message.chatId) ?? asString(message.phone) ?? asString(message.sender);
  if (!chatId || chatId.endsWith("@lid")) return;
  const phone = normalizePhone(chatId.split("@")[0]);
  const contentObject = typeof message.content === "object" && message.content ? message.content as Record<string, unknown> : {};
  const content = asString(message.text) ?? asString(contentObject.text) ?? asString(message.body) ?? "";
  const mediaUrl = asString(message.mediaUrl) ?? asString(message.file) ?? asString(contentObject.url);
  const type = messageType(asString(message.type));
  const externalId = asString(message.messageid) ?? asString(message.id);
  const displayName = asString(message.pushName) ?? asString(message.senderName) ?? `WhatsApp ${phone.slice(-4)}`;

  const lead = await prisma.lead.upsert({ where: { phone }, update: { lastActivityAt: new Date() }, create: { name: displayName, phone, stage: "NOVO", source: "WHATSAPP", lastActivityAt: new Date() } });
  let conversation = await prisma.conversation.findFirst({ where: { leadId: lead.id, status: { not: "ENCERRADO" } }, orderBy: { updatedAt: "desc" } });
  if (!conversation) conversation = await prisma.conversation.create({ data: { leadId: lead.id, uazapiChatId: chatId } });
  const previousCount = await prisma.message.count({ where: { conversationId: conversation.id } });
  let transcription: string | null = null;
  if (type === "AUDIO" && mediaUrl) transcription = await transcribeAudio(mediaUrl).catch(() => null);
  if (externalId) {
    const duplicate = await prisma.activity.findFirst({ where: { leadId: lead.id, type: "uazapi_message", detail: { contains: externalId } } });
    if (duplicate) return;
  }
  const savedMessage = await prisma.message.create({ data: { conversationId: conversation.id, sender: "LEAD", content: content || transcription || `[${type.toLowerCase()} recebido]`, type, mediaUrl, transcription } });
  if (externalId) await prisma.activity.create({ data: { leadId: lead.id, type: "uazapi_message", detail: JSON.stringify({ externalId, messageId: savedMessage.id }) } });
  const analyzedText = transcription || content;
  if (analyzedText && process.env.OPENAI_API_KEY) {
    const sentiment = await analyzeSentiment(analyzedText).catch(() => null);
    if (sentiment) await prisma.conversation.update({ where: { id: conversation.id }, data: { sentiment: sentiment.sentiment } });
  }
  if (conversation.status === "BOT" && analyzedText && process.env.OPENAI_API_KEY && process.env.UAZAPI_TOKEN) {
    const history = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { sentAt: "asc" }, take: 30 });
    const reply = previousCount === 0
      ? await generatePreAttendance({ leadPhone: phone, firstMessage: analyzedText })
      : await generateWhatsAppReply({ leadName: lead.name, leadStage: lead.stage, livesCount: lead.livesCount, notes: lead.notes ?? "", conversationHistory: history.map((item) => ({ role: item.sender === "LEAD" ? "user" as const : "assistant" as const, content: item.transcription || item.content })), triggerType: "new_message" });
    await sendText(phone, reply);
    await prisma.message.create({ data: { conversationId: conversation.id, sender: "BOT", content: reply } });
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
  if (!process.env.UAZAPI_WEBHOOK_SECRET || request.headers.get("x-webhook-secret") !== process.env.UAZAPI_WEBHOOK_SECRET) return new NextResponse("Unauthorized", { status: 401 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!(await allowRequest(`uazapi:${ip}`, 120))) return new NextResponse("Too Many Requests", { status: 429 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const message = parsed.data.message ?? parsed.data.data ?? {}; const event = parsed.data.event.toLowerCase();
  after(async () => { try { if (["messages", "message.received"].includes(event)) await processReceived(message); else if (["messages_update", "message.delivered", "message.read"].includes(event)) await processUpdate(message); } catch (error) { const text=error instanceof Error?error.message:"Falha desconhecida";await prisma.errorLog.create({data:{source:"webhook",message:text,stack:error instanceof Error?error.stack:undefined,context:{event}}}).catch(()=>undefined);console.error("Falha no processamento do webhook", error instanceof Error ? { name: error.name, message: error.message } : { type: typeof error }); } });
  return NextResponse.json({ ok: true });
}
