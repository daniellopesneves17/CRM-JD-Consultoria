// Agenda reativações e registra a execução para auditoria administrativa.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enabledAutomationUsers } from "@/lib/automation-access";
import { executeAutomationForUser } from "@/lib/automation-execution";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("reactivation");
  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: "base-reactivation" } });
    if (!rule) {
      await finishCron(cron.id, 0, 0, "Automação desativada.");
      return NextResponse.json({ ok: true, scheduled: 0, disabled: true });
    }
    let scheduled = 0;
    const userIds = await enabledAutomationUsers(rule);
    for (const userId of userIds) {
      const result = await executeAutomationForUser(rule.id, userId);
      if ("scheduled" in result) scheduled += result.scheduled ?? 0;
    }
    await finishCron(cron.id, scheduled);
    return NextResponse.json({ ok: true, scheduled, disabled: userIds.length === 0 });
  } catch (error) {
    await failCron(cron.id, "reactivation", error);
    return NextResponse.json({ error: "Falha ao agendar reativações." }, { status: 500 });
  }
}
