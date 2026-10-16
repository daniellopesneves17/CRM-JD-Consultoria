import { NextResponse } from "next/server";
import { enabledAutomationUsers } from "@/lib/automation-access";
import { executeAutomationForUser, isBulkReactivationAutomation } from "@/lib/automation-execution";
import { isScheduledAutomationDue, saoPauloClock, type ScheduledAutomationConfig } from "@/lib/automation-schedule";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const now = new Date();
  const { dateKey } = saoPauloClock(now);
  const rules = await prisma.automationRule.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  const dueRules = rules.filter((rule) => {
    const config = (rule.config ?? {}) as ScheduledAutomationConfig;
    return isBulkReactivationAutomation(rule.trigger, rule.config) && isScheduledAutomationDue(config, now);
  });
  const executions = [];

  for (const rule of dueRules) {
    const jobName = `scheduled-automation:${rule.id}:${dateKey}`;
    const cron = await startCron(jobName, 36 * 60 * 60_000);
    if (!cron) {
      executions.push({ automationId: rule.id, skipped: true });
      continue;
    }
    try {
      const userIds = await enabledAutomationUsers(rule);
      let sent = 0;
      let errors = 0;
      const results = [];
      for (const userId of userIds) {
        try {
          const result = await executeAutomationForUser(rule.id, userId, undefined, { source: "scheduled" });
          sent += "sent" in result ? Number(result.sent) : 0;
          errors += "errors" in result ? Number(result.errors) : 0;
          results.push({ userId, ok: true, result });
        } catch (error) {
          errors += 1;
          results.push({ userId, ok: false, error: error instanceof Error ? error.message : "Falha na execução." });
        }
      }
      await finishCron(cron.id, sent, errors, JSON.stringify({ automationId: rule.id, users: userIds.length }));
      executions.push({ automationId: rule.id, sent, errors, results });
    } catch (error) {
      await failCron(cron.id, jobName, error);
      executions.push({ automationId: rule.id, error: error instanceof Error ? error.message : "Falha na execução." });
    }
  }

  return NextResponse.json({ ok: true, dateKey, executions });
}

export const POST = GET;
