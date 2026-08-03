// Processa follow-ups por regra e tarefas de reativação vencidas, limitado por execução.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron } from "@/lib/cron";
import { generateWhatsAppReply, suggestReactivationStrategy } from "@/services/ai";
import { sendText } from "@/services/uazapi";
export const maxDuration = 300;
export async function GET(request: Request) {
  const denied = authorizeCron(request); if (denied) return denied; let sent = 0;
  const dueReactivations = await prisma.task.findMany({ where: { type: "REATIVACAO", done: false, dueAt: { lte: new Date() } }, include: { lead: { include: { conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { sentAt: "desc" }, take: 8 } } } } } }, take: 15 });
  for (const task of dueReactivations) { const messages = task.lead.conversations[0]?.messages ?? []; const strategy = await suggestReactivationStrategy({ leadProfile: { name: task.lead.name, stage: task.lead.stage, lostReason: task.lead.lostReason ?? undefined, notes: task.lead.notes ?? undefined }, lastMessages: messages.map((item) => ({ sender: item.sender, content: item.content })) }); await sendText(task.lead.phone, strategy.message); await prisma.$transaction([prisma.task.update({ where: { id: task.id }, data: { done: true, doneAt: new Date() } }), prisma.activity.create({ data: { leadId: task.leadId, type: "reactivation_sent", detail: strategy.approach } })]); sent += 1; }
  const rules = await prisma.automationRule.findMany({ where: { trigger: "proposal_sent_no_response", active: true }, orderBy: { delayHours: "asc" } });
  for (const rule of rules) { if (sent >= 20) break; const threshold = new Date(Date.now() - rule.delayHours * 3_600_000); const leads = await prisma.lead.findMany({ where: { stage: "PROPOSTA_ENVIADA", lastActivityAt: { lt: threshold }, activities: { none: { type: `follow_up_${rule.id}` } } }, include: { conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { sentAt: "asc" }, take: 30 } } } }, take: 20 - sent }); for (const lead of leads) { const messages = lead.conversations[0]?.messages ?? []; const text = await generateWhatsAppReply({ leadName: lead.name, leadStage: lead.stage, livesCount: lead.livesCount, notes: `${lead.notes ?? ""}\nModelo da regra: ${rule.template}`, conversationHistory: messages.map((item) => ({ role: item.sender === "LEAD" ? "user" as const : "assistant" as const, content: item.content })), triggerType: "follow_up" }); await sendText(lead.phone, text); await prisma.activity.create({ data: { leadId: lead.id, type: `follow_up_${rule.id}`, detail: `Follow-up automático: ${rule.name}` } }); sent += 1; } }
  return NextResponse.json({ ok: true, sent });
}

