// Sugere uma resposta com IA e, somente quando solicitado, envia via Uazapi.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { generateWhatsAppReply } from "@/services/ai";
import { sendText, type UazapiConfig } from "@/services/uazapi";

const bodySchema = z.object({ send: z.boolean().default(false), text: z.string().trim().min(1).max(4000).optional(), ownerId: z.string().cuid().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const { id } = await params; const body = bodySchema.parse(await request.json().catch(() => ({})));
    const conversation = await prisma.conversation.findFirst({ where: { id, lead: { userId: access.session.user.role === "ADMIN" ? body.ownerId || "__admin_scope_required__" : access.session.user.id } }, include: { lead: { include: { assignedTo: { select: { uazapiBaseUrl: true, uazapiToken: true } } } }, messages: { orderBy: { sentAt: "asc" }, take: 40 } } });
    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    const suggestion = body.text ?? await generateWhatsAppReply({ leadName: conversation.lead.name, leadStage: conversation.lead.stage, livesCount: conversation.lead.livesCount, notes: conversation.lead.notes ?? "", conversationHistory: conversation.messages.map((message) => ({ role: message.sender === "LEAD" ? "user" as const : "assistant" as const, content: message.transcription || message.content })), triggerType: "new_message" });
    if (!body.send) return NextResponse.json({ suggestion });
    const owner = conversation.lead.assignedTo;
    const config: UazapiConfig | undefined = owner?.uazapiToken && owner.uazapiBaseUrl ? { baseUrl: owner.uazapiBaseUrl, token: owner.uazapiToken } : undefined;
    const sent = await sendText(conversation.lead.phone, suggestion, config);
    const message = await prisma.message.create({ data: { conversationId: id, sender: "CORRETOR", content: suggestion, userId: access.session.user.id } });
    const externalId = typeof sent.messageid === "string" ? sent.messageid : typeof sent.id === "string" ? sent.id : null;
    if (externalId) await prisma.activity.create({ data: { leadId: conversation.leadId, type: "uazapi_message", detail: JSON.stringify({ externalId, messageId: message.id }) } });
    await prisma.lead.update({ where: { id: conversation.leadId }, data: { lastActivityAt: new Date() } });
    return NextResponse.json({ suggestion, message });
  } catch (error) { return apiError(error, "Não foi possível gerar ou enviar a resposta."); }
}

