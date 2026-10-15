// Executa follow-ups e registra duração, volume processado e falhas para auditoria.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enabledAutomationUsers, isAutomationActiveForUser } from "@/lib/automation-access";
import { executeAutomationForUser } from "@/lib/automation-execution";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { suggestReactivationStrategy } from "@/services/ai";
import { sendText, type UazapiConfig } from "@/services/uazapi";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("follow-up");
  let sent = 0;
  try {
    const dueReactivations = await prisma.task.findMany({
      where: { type: "REATIVACAO", done: false, dueAt: { lte: new Date() } },
      include: { lead: { include: { assignedTo: { select: { uazapiBaseUrl: true, uazapiToken: true } }, conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { sentAt: "desc" }, take: 8 } } } } } },
      take: 15
    });
    for (const task of dueReactivations) {
      if (!(await isAutomationActiveForUser("base-reactivation", task.lead.userId))) continue;
      const messages = task.lead.conversations[0]?.messages ?? [];
      const owner = task.lead.assignedTo;
      if (!owner?.uazapiToken || !owner.uazapiBaseUrl) continue;
      const config: UazapiConfig = { baseUrl: owner.uazapiBaseUrl, token: owner.uazapiToken };
      const strategy = await suggestReactivationStrategy({ leadProfile: { name: task.lead.name, stage: task.lead.stage, lostReason: task.lead.lostReason ?? undefined, notes: task.lead.notes ?? undefined }, lastMessages: messages.map((item) => ({ sender: item.sender, content: item.content })) });
      await sendText(task.lead.phone, strategy.message, config);
      await prisma.$transaction([
        prisma.task.update({ where: { id: task.id }, data: { done: true, doneAt: new Date() } }),
        prisma.activity.create({ data: { leadId: task.leadId, type: "reactivation_sent", detail: strategy.approach } })
      ]);
      sent += 1;
    }

    const rules = await prisma.automationRule.findMany({ where: { trigger: "proposal_sent_no_response" }, orderBy: { delayHours: "asc" } });
    for (const rule of rules) {
      if (sent >= 20) break;
      const userIds = await enabledAutomationUsers(rule);
      for (const userId of userIds) {
        if (sent >= 20) break;
        const result = await executeAutomationForUser(rule.id, userId, 20 - sent);
        if ("sent" in result) sent += result.sent ?? 0;
      }
    }
    await finishCron(cron.id, sent);
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    await failCron(cron.id, "follow-up", error);
    return NextResponse.json({ error: "Falha no follow-up automático." }, { status: 500 });
  }
}
