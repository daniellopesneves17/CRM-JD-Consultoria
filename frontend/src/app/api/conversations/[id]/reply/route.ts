// Sugere uma resposta com IA e, somente quando solicitado, envia via Uazapi.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { generateWhatsAppReply } from "@/services/ai";
import { sendText } from "@/services/uazapi";

const bodySchema = z.object({ send: z.boolean().default(false), text: z.string().trim().min(1).max(4000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const { id } = await params; const body = bodySchema.parse(await request.json().catch(() => ({})));
    const conversation = await prisma.conversation.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) }, include: { lead: true, messages: { orderBy: { sentAt: "asc" }, take: 40 } } });
    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    const suggestion = body.text ?? await generateWhatsAppReply({ leadName: conversation.lead.name, leadStage: conversation.lead.stage, livesCount: conversation.lead.livesCount, notes: conversation.lead.notes ?? "", conversationHistory: conversation.messages.map((message) => ({ role: message.sender === "LEAD" ? "user" as const : "assistant" as const, content: message.transcription || message.content })), triggerType: "new_message" });
    if (!body.send) return NextResponse.json({ suggestion });
    await sendText(conversation.lead.phone, suggestion);
    const message = await prisma.message.create({ data: { conversationId: id, sender: "CORRETOR", content: suggestion, userId: access.session.user.id } });
    await prisma.lead.update({ where: { id: conversation.leadId }, data: { lastActivityAt: new Date() } });
    return NextResponse.json({ suggestion, message });
  } catch (error) { return apiError(error, "Não foi possível gerar ou enviar a resposta."); }
}

