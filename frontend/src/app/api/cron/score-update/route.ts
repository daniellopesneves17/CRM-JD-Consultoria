// Recalcula scores e registra a execução para o painel de logs.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { scoreLeadConversation } from "@/services/ai";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("score-update");
  let updated = 0;
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: "automatic-score" } });
    if (rule && !rule.active) {
      await finishCron(cron.id, 0, 0, "Automação desativada.");
      return NextResponse.json({ ok: true, updated: 0, disabled: true });
    }
    const leads = await prisma.lead.findMany({ where: { OR: [{ score: 0 }, { lastActivityAt: { gte: new Date(Date.now() - 8 * 3_600_000) } }] }, include: { conversations: { include: { messages: { orderBy: { sentAt: "asc" } } } } }, take: 20 });
    for (const lead of leads) {
      const result = await scoreLeadConversation({ leadId: lead.id, leadProfile: { name: lead.name, livesCount: lead.livesCount, stage: lead.stage, estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined }, allMessages: lead.conversations.flatMap((item) => item.messages.map((message) => ({ sender: message.sender, content: message.transcription || message.content, sentAt: message.sentAt }))) });
      await prisma.lead.update({ where: { id: lead.id }, data: { score: result.score, temperature: result.temperature } });
      if (Math.abs(lead.score - result.score) > 20) await prisma.activity.create({ data: { leadId: lead.id, type: "significant_score_change", detail: `${lead.score} → ${result.score}: ${result.reasoning}` } });
      updated += 1;
    }
    if (rule) await prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
    await finishCron(cron.id, updated);
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    await failCron(cron.id, "score-update", error);
    return NextResponse.json({ error: "Falha ao atualizar scores." }, { status: 500 });
  }
}
