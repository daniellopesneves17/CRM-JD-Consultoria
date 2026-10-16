// Recalcula scores e registra a execução para o painel de logs.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enabledAutomationUsers } from "@/lib/automation-access";
import { executeAutomationForUser } from "@/lib/automation-execution";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("score-update", 50 * 60_000);
  if (!cron) return NextResponse.json({ ok: true, skipped: true, reason: "Execução recente ou em andamento." }, { status: 202 });
  let updated = 0;
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: "automatic-score" } });
    if (!rule) {
      await finishCron(cron.id, 0, 0, "Automação desativada.");
      return NextResponse.json({ ok: true, updated: 0, disabled: true });
    }
    const userIds = await enabledAutomationUsers(rule);
    for (const userId of userIds) {
      const result = await executeAutomationForUser(rule.id, userId, Math.max(1, 20 - updated));
      if ("updated" in result) updated += result.updated ?? 0;
      if (updated >= 20) break;
    }
    await finishCron(cron.id, updated);
    return NextResponse.json({ ok: true, updated, disabled: userIds.length === 0 });
  } catch (error) {
    await failCron(cron.id, "score-update", error);
    return NextResponse.json({ error: "Falha ao atualizar scores." }, { status: 500 });
  }
}

export const POST = GET;
