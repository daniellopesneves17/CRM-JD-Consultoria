// Recalcula o score do lead com a camada profunda de IA.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { scoreLeadConversation } from "@/services/ai";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const lead = await prisma.lead.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }) }, include: { conversations: { include: { messages: { orderBy: { sentAt: "asc" } } } } } });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    const result = await scoreLeadConversation({ leadId: lead.id, leadProfile: { name: lead.name, livesCount: lead.livesCount, stage: lead.stage, estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined }, allMessages: lead.conversations.flatMap((conversation) => conversation.messages.map((message) => ({ sender: message.sender, content: message.transcription || message.content, sentAt: message.sentAt }))) });
    const updated = await prisma.lead.update({ where: { id }, data: { score: result.score, temperature: result.temperature } });
    await prisma.activity.create({ data: { leadId: id, type: "score_updated", detail: result.reasoning } });
    return NextResponse.json({ ...result, lead: updated });
  } catch (error) { return apiError(error, "Não foi possível recalcular o score."); }
}

