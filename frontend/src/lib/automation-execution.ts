import { prisma } from "@/lib/prisma";
import { isAutomationActiveForUser } from "@/lib/automation-access";
import { generateWhatsAppReply, scoreLeadConversation } from "@/services/ai";
import { sendText, type UazapiConfig } from "@/services/uazapi";

function boundedLimit(value?: number) {
  return Math.min(20, Math.max(1, value ?? 10));
}

export async function executeAutomationForUser(automationId: string, userId: string, requestedLimit?: number) {
  const [rule, user] = await Promise.all([
    prisma.automationRule.findUnique({ where: { id: automationId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true },
    }),
  ]);
  if (!rule) throw new Error("Automação não encontrada.");
  if (!user?.active || !user.crmEnabled) throw new Error("O CRM deste usuário está desabilitado.");
  if (!(await isAutomationActiveForUser(rule.id, user.id))) throw new Error("Ative esta automação no CRM antes de executá-la.");

  const limit = boundedLimit(requestedLimit);
  const config = (rule.config ?? {}) as { inactiveDays?: number; dailyLimit?: number };

  if (rule.trigger === "proposal_sent_no_response") {
    const threshold = new Date(Date.now() - rule.delayHours * 3_600_000);
    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        stage: "PROPOSTA_ENVIADA",
        lastActivityAt: { lt: threshold },
        activities: { none: { type: `follow_up_${rule.id}` } },
      },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: { messages: { orderBy: { sentAt: "asc" }, take: 30 } },
        },
      },
      take: limit,
    });
    const uazapi: UazapiConfig | undefined = user.uazapiToken && user.uazapiBaseUrl
      ? { baseUrl: user.uazapiBaseUrl, token: user.uazapiToken }
      : undefined;
    if (leads.length > 0 && !uazapi) throw new Error("Conecte a Uazapi deste corretor antes de executar envios automáticos.");
    let sent = 0;
    for (const lead of leads) {
      const messages = lead.conversations[0]?.messages ?? [];
      const text = await generateWhatsAppReply({
        leadName: lead.name,
        leadStage: lead.stage,
        livesCount: lead.livesCount,
        notes: `${lead.notes ?? ""}\nModelo da regra: ${rule.template}`,
        conversationHistory: messages.map((message) => ({
          role: message.sender === "LEAD" ? "user" as const : "assistant" as const,
          content: message.content,
        })),
        triggerType: "follow_up",
      });
      await sendText(lead.phone, text, uazapi);
      await prisma.activity.create({
        data: { leadId: lead.id, type: `follow_up_${rule.id}`, detail: `Follow-up automático: ${rule.name}` },
      });
      sent += 1;
    }
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { sentCount: { increment: sent }, lastRunAt: new Date() },
    });
    return { automationId: rule.id, automation: rule.name, executed: true, action: "follow_up", sent };
  }

  if (rule.trigger === "inactive_lead" || rule.trigger === "cold_lead") {
    const inactiveDays = Math.max(1, config.inactiveDays ?? 30);
    const dailyLimit = Math.min(limit, Math.min(50, Math.max(1, config.dailyLimit ?? 15)));
    const threshold = new Date(Date.now() - inactiveDays * 86_400_000);
    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        stage: { in: ["QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE"] },
        lastActivityAt: { lt: threshold },
        tasks: { none: { type: "REATIVACAO", done: false } },
        activities: { none: { type: "reactivation_sent", createdAt: { gte: threshold } } },
      },
      take: dailyLimit,
    });
    await prisma.task.createMany({
      data: leads.map((lead) => ({
        leadId: lead.id,
        title: "Reativação automática",
        description: "Mensagem personalizada pela IA",
        type: "REATIVACAO" as const,
        dueAt: new Date(Date.now() + Math.floor(Math.random() * 180) * 60_000),
      })),
    });
    await prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
    return { automationId: rule.id, automation: rule.name, executed: true, action: "reactivation", scheduled: leads.length };
  }

  if (rule.trigger === "periodic_score") {
    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        OR: [{ score: 0 }, { lastActivityAt: { gte: new Date(Date.now() - 8 * 3_600_000) } }],
      },
      include: { conversations: { include: { messages: { orderBy: { sentAt: "asc" } } } } },
      take: limit,
    });
    for (const lead of leads) {
      const result = await scoreLeadConversation({
        leadId: lead.id,
        leadProfile: {
          name: lead.name,
          livesCount: lead.livesCount,
          stage: lead.stage,
          estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined,
        },
        allMessages: lead.conversations.flatMap((conversation) => conversation.messages.map((message) => ({
          sender: message.sender,
          content: message.transcription || message.content,
          sentAt: message.sentAt,
        }))),
      });
      await prisma.lead.update({ where: { id: lead.id }, data: { score: result.score, temperature: result.temperature } });
      if (Math.abs(lead.score - result.score) > 20) {
        await prisma.activity.create({
          data: { leadId: lead.id, type: "significant_score_change", detail: `${lead.score} → ${result.score}: ${result.reasoning}` },
        });
      }
    }
    await prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
    return { automationId: rule.id, automation: rule.name, executed: true, action: "score", updated: leads.length };
  }

  return {
    automationId: rule.id,
    automation: rule.name,
    executed: false,
    awaitingTrigger: true,
    message: "Automação ativada. Esta rotina é executada automaticamente quando o gatilho correspondente ocorre.",
  };
}
