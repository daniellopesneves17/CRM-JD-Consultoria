// Atualiza scores de leads recentes ou ainda não avaliados, com limite por execução.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron } from "@/lib/cron";
import { scoreLeadConversation } from "@/services/ai";
export const maxDuration = 300;
export async function GET(request: Request) {
  const denied = authorizeCron(request); if (denied) return denied; const leads = await prisma.lead.findMany({ where: { OR: [{ score: 0 }, { lastActivityAt: { gte: new Date(Date.now() - 8 * 3_600_000) } }] }, include: { conversations: { include: { messages: { orderBy: { sentAt: "asc" } } } } }, take: 20 }); let updated = 0;
  for (const lead of leads) { const result = await scoreLeadConversation({ leadId: lead.id, leadProfile: { name: lead.name, livesCount: lead.livesCount, stage: lead.stage, estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined }, allMessages: lead.conversations.flatMap((item) => item.messages.map((message) => ({ sender: message.sender, content: message.transcription || message.content, sentAt: message.sentAt }))) }); await prisma.lead.update({ where: { id: lead.id }, data: { score: result.score, temperature: result.temperature } }); if (Math.abs(lead.score - result.score) > 20) await prisma.activity.create({ data: { leadId: lead.id, type: "significant_score_change", detail: `${lead.score} → ${result.score}: ${result.reasoning}` } }); updated += 1; }
  return NextResponse.json({ ok: true, updated });
}
