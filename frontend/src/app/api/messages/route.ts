// Envio manual de mensagem pelo corretor, com persistência após confirmação da Uazapi.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { sendText } from "@/services/uazapi";

const schema = z.object({ conversationId: z.string().cuid(), content: z.string().trim().min(1).max(4000) });

export async function POST(request: Request) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const data = schema.parse(await request.json());
    const conversation = await prisma.conversation.findFirst({ where: { id: data.conversationId, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) }, include: { lead: true } });
    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    const sent = await sendText(conversation.lead.phone, data.content);
    const message = await prisma.message.create({ data: { conversationId: data.conversationId, content: data.content, sender: "CORRETOR", userId: access.session.user.id } });
    const externalId = typeof sent.messageid === "string" ? sent.messageid : typeof sent.id === "string" ? sent.id : null;
    if (externalId) await prisma.activity.create({ data: { leadId: conversation.leadId, type: "uazapi_message", detail: JSON.stringify({ externalId, messageId: message.id }) } });
    await prisma.lead.update({ where: { id: conversation.leadId }, data: { lastActivityAt: new Date() } });
    return NextResponse.json(message, { status: 201 });
  } catch (error) { return apiError(error, "Não foi possível enviar a mensagem."); }
}

