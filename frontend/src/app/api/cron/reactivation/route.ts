// Agenda reativações e registra a execução para auditoria administrativa.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("reactivation");
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: "base-reactivation" } });
    if (rule && !rule.active) {
      await finishCron(cron.id, 0, 0, "Automação desativada.");
      return NextResponse.json({ ok: true, scheduled: 0, disabled: true });
    }
    const config = (rule?.config ?? {}) as { inactiveDays?: number; dailyLimit?: number };
    const inactiveDays = Math.max(1, config.inactiveDays ?? 30);
    const dailyLimit = Math.min(50, Math.max(1, config.dailyLimit ?? 15));
    const threshold = new Date(Date.now() - inactiveDays * 86_400_000);
    const leads = await prisma.lead.findMany({ where: { stage: { in: ["QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE"] }, lastActivityAt: { lt: threshold }, tasks: { none: { type: "REATIVACAO", done: false } }, activities: { none: { type: "reactivation_sent", createdAt: { gte: threshold } } } }, take: dailyLimit });
    await prisma.task.createMany({ data: leads.map((lead) => ({ leadId: lead.id, title: "Reativação automática", description: "Mensagem personalizada pela IA", type: "REATIVACAO" as const, dueAt: new Date(Date.now() + Math.floor(Math.random() * 180) * 60_000) })) });
    if (rule) await prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
    await finishCron(cron.id, leads.length);
    return NextResponse.json({ ok: true, scheduled: leads.length });
  } catch (error) {
    await failCron(cron.id, "reactivation", error);
    return NextResponse.json({ error: "Falha ao agendar reativações." }, { status: 500 });
  }
}
