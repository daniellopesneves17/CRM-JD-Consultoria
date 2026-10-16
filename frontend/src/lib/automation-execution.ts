import { PipelineStage, Role } from "@prisma/client";
import { requireRegisteredBrokerFirstName } from "@/lib/broker-identity";
import { prisma } from "@/lib/prisma";
import { isAutomationActiveForUser } from "@/lib/automation-access";
import { generateWhatsAppReply, scoreLeadConversation } from "@/services/ai";
import { assessContactIdentities } from "@/services/ai/contact-name";
import { resolveUazapiConfig, sendText } from "@/services/uazapi";

function boundedLimit(value?: number) {
  return Math.min(50, Math.max(1, value ?? 10));
}

type AutomationExecutionOptions = {
  allowInactive?: boolean;
  source?: "manual" | "scheduled";
};

type BulkReactivationConfig = {
  canal?: string;
  excluir_etapas?: string[];
  filtros_por_corretor?: Record<string, { nome_contem?: string }>;
  limite_por_corretor_dia?: number;
  avaliar_leads_com_14_dias_ou_mais?: boolean;
  respeitar_opt_out?: boolean;
};

const OPT_OUT_PATTERN = /\b(?:pare|parar|remov(?:a|er)|sair|cancele|cancelar|n[aã]o\s+(?:quero|tenho interesse)|sem\s+interesse)\b/i;

function saoPauloDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00-03:00`);
}

function renderAutomationTemplate(template: string, leadName: string, brokerName: string) {
  return template
    .replace(/\[NOME DO CORRETOR\]/gi, brokerName)
    .replace(/\[NOME\]/gi, leadName);
}

type IdentityLead = {
  id: string;
  name: string;
  notes: string | null;
  conversations: Array<{ messages: Array<{ sender: string; content: string }> }>;
};

async function selectSafeAutomationLeads<T extends IdentityLead>(params: {
  leads: T[];
  userId: string;
  automationId: string;
  limit: number;
}) {
  const names = [...new Set(params.leads.map((lead) => lead.name))];
  const grouped = names.length ? await prisma.lead.groupBy({
    by: ["name"],
    where: { userId: params.userId, name: { in: names } },
    _count: { _all: true },
  }) : [];
  const occurrences = new Map(grouped.map((item) => [item.name.toLocaleLowerCase("pt-BR"), item._count._all]));
  const approved: Array<{ lead: T; cleanName: string; greetingName: string }> = [];
  let blocked = 0;
  let errors = 0;

  for (let index = 0; index < params.leads.length && approved.length < params.limit; index += 20) {
    const batch = params.leads.slice(index, index + 20);
    try {
      const assessments = await assessContactIdentities(batch.map((lead) => ({
        key: lead.id,
        rawName: lead.name,
        nameOccurrences: occurrences.get(lead.name.toLocaleLowerCase("pt-BR")) ?? 1,
        notes: lead.notes,
        incomingMessages: lead.conversations.flatMap((conversation) => conversation.messages)
          .filter((message) => message.sender === "LEAD")
          .map((message) => message.content),
      })));
      const byKey = new Map(assessments.map((assessment) => [assessment.key, assessment]));
      const auditRows = [];
      for (const lead of batch) {
        const assessment = byKey.get(lead.id);
        const identityApproved = Boolean(assessment?.approved && assessment.cleanName && assessment.greetingName);
        if (identityApproved && approved.length < params.limit) {
          approved.push({ lead, cleanName: assessment!.cleanName!, greetingName: assessment!.greetingName! });
        } else if (!identityApproved) {
          blocked += 1;
        }
        auditRows.push({
          leadId: lead.id,
          type: `automation_identity_${identityApproved ? "approved" : "blocked"}_${params.automationId}`,
          detail: JSON.stringify({
            rawName: lead.name,
            cleanName: assessment?.cleanName ?? null,
            greetingName: assessment?.greetingName ?? null,
            confidence: assessment?.confidence ?? 0,
            evidence: assessment?.evidence ?? "NONE",
            reason: assessment?.reason ?? "Contato sem avaliação conclusiva.",
          }),
        });
      }
      await prisma.activity.createMany({ data: auditRows });
    } catch (error) {
      errors += batch.length;
      blocked += batch.length;
      await prisma.errorLog.create({
        data: {
          source: "automation_identity",
          message: error instanceof Error ? error.message : "Falha ao validar nomes antes da automação.",
          context: { automationId: params.automationId, userId: params.userId, leadIds: batch.map((lead) => lead.id) },
        },
      }).catch(() => undefined);
      break;
    }
  }

  return { approved, blocked, errors };
}

export function isBulkReactivationAutomation(trigger: string, config: unknown) {
  if (trigger === "diariamente_as_14h_leads_com_14_dias_ou_mais_sem_resposta") return true;
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  return (config as BulkReactivationConfig).avaliar_leads_com_14_dias_ou_mais === true;
}

export async function executeAutomationForUser(
  automationId: string,
  userId: string,
  requestedLimit?: number,
  options: AutomationExecutionOptions = {},
) {
  const [rule, user] = await Promise.all([
    prisma.automationRule.findUnique({ where: { id: automationId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true },
    }),
  ]);
  if (!rule) throw new Error("Automação não encontrada.");
  if (!user?.active || !user.crmEnabled) throw new Error("O CRM deste usuário está desabilitado.");
  if (!options.allowInactive && !(await isAutomationActiveForUser(rule.id, user.id))) throw new Error("Ative esta automação no CRM antes de executá-la.");

  const limit = boundedLimit(requestedLimit);
  const config = (rule.config ?? {}) as { inactiveDays?: number; dailyLimit?: number };

  if (isBulkReactivationAutomation(rule.trigger, rule.config)) {
    const bulkConfig = (rule.config ?? {}) as BulkReactivationConfig;
    const brokerFirstName = requireRegisteredBrokerFirstName(user.name);
    const inactiveDays = 14;
    const threshold = new Date(Date.now() - inactiveDays * 86_400_000);
    const dayStart = saoPauloDayStart();
    const configuredLimit = Math.min(50, Math.max(1, bulkConfig.limite_por_corretor_dia ?? 35));
    const manualLimit = requestedLimit == null ? configuredLimit : boundedLimit(requestedLimit);
    const activityType = `automation_sent_${rule.id}`;
    const alreadySentToday = await prisma.activity.count({
      where: { type: activityType, createdAt: { gte: dayStart }, lead: { userId: user.id } },
    });
    const remaining = Math.max(0, Math.min(manualLimit, configuredLimit - alreadySentToday));
    if (remaining === 0) {
      return { automationId: rule.id, automation: rule.name, executed: true, action: "bulk_reactivation", sent: 0, errors: 0, dailyLimitReached: true };
    }

    const excludedStages = (bulkConfig.excluir_etapas ?? ["FECHADO", "PERDIDO"])
      .filter((stage): stage is PipelineStage => Object.values(PipelineStage).includes(stage as PipelineStage));
    const nameFilter = bulkConfig.filtros_por_corretor?.[user.id]?.nome_contem?.trim();
    const candidates = await prisma.lead.findMany({
      where: {
        userId: user.id,
        ...(excludedStages.length ? { stage: { notIn: excludedStages } } : {}),
        ...(nameFilter ? { name: { contains: nameFilter, mode: "insensitive" } } : {}),
        OR: [
          { lastActivityAt: { lte: threshold } },
          { lastActivityAt: null, createdAt: { lte: threshold } },
        ],
        activities: { none: { type: activityType, createdAt: { gte: dayStart } } },
      },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: { messages: { where: { sender: "LEAD" }, orderBy: { sentAt: "desc" }, take: 12 } },
        },
      },
      orderBy: [{ lastActivityAt: "asc" }, { createdAt: "asc" }],
      take: Math.min(150, remaining * 3),
    });
    const consented = candidates.filter((lead) => !bulkConfig.respeitar_opt_out || !OPT_OUT_PATTERN.test(`${lead.notes ?? ""}\n${lead.conversations[0]?.messages.map((message) => message.content).join("\n") ?? ""}`));
    const identity = await selectSafeAutomationLeads({ leads: consented, userId: user.id, automationId: rule.id, limit: remaining });
    const leads = identity.approved;
    const uazapi = resolveUazapiConfig(user);
    if (leads.length > 0 && !uazapi) throw new Error(`Conecte a Uazapi de ${user.name} antes de executar os envios.`);

    let sent = 0;
    let errors = identity.errors;
    for (const { lead, greetingName } of leads) {
      const text = renderAutomationTemplate(rule.template, greetingName, brokerFirstName);
      try {
        await sendText(lead.phone, text, uazapi);
        const conversation = lead.conversations[0]
          ?? await prisma.conversation.create({ data: { leadId: lead.id, status: "BOT" } });
        await prisma.$transaction([
          prisma.message.create({ data: { conversationId: conversation.id, sender: "BOT", content: text } }),
          prisma.activity.create({
            data: {
              leadId: lead.id,
              type: activityType,
              detail: `${options.source === "scheduled" ? "Execução automática" : "Execução manual"}: ${rule.name}`,
            },
          }),
          prisma.lead.update({ where: { id: lead.id }, data: { lastActivityAt: new Date() } }),
        ]);
        sent += 1;
      } catch (error) {
        errors += 1;
        await prisma.errorLog.create({
          data: {
            source: "automation",
            message: error instanceof Error ? error.message : "Falha ao enviar reativação automática.",
            context: { automationId: rule.id, userId: user.id, leadId: lead.id, source: options.source ?? "manual" },
          },
        }).catch(() => undefined);
      }
    }
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { sentCount: { increment: sent }, lastRunAt: new Date() },
    });
    return {
      automationId: rule.id,
      automation: rule.name,
      executed: true,
      action: "bulk_reactivation",
      eligible: leads.length,
      sent,
      errors,
      identityBlocked: identity.blocked,
      identityErrors: identity.errors,
      remainingToday: Math.max(0, configuredLimit - alreadySentToday - sent),
    };
  }

  if (rule.trigger === "proposal_sent_no_response") {
    const brokerFirstName = requireRegisteredBrokerFirstName(user.name);
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
    const uazapi = resolveUazapiConfig(user);
    if (leads.length > 0 && !uazapi) throw new Error("Conecte a Uazapi deste corretor antes de executar envios automáticos.");
    const identity = await selectSafeAutomationLeads({ leads, userId: user.id, automationId: rule.id, limit });
    let sent = 0;
    for (const { lead, greetingName } of identity.approved) {
      const messages = lead.conversations[0]?.messages ?? [];
      const text = await generateWhatsAppReply({
        brokerFirstName,
        leadName: greetingName,
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
    return {
      automationId: rule.id,
      automation: rule.name,
      executed: true,
      action: "follow_up",
      sent,
      errors: identity.errors,
      identityBlocked: identity.blocked,
    };
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

export async function executeAutomationForActor(
  automationId: string,
  actor: { id: string; role: Role },
  requestedLimit?: number,
  targetUserId?: string | null,
) {
  if (actor.role !== Role.ADMIN) {
    return executeAutomationForUser(automationId, actor.id, requestedLimit, { source: "manual" });
  }
  if (targetUserId) {
    return executeAutomationForUser(automationId, targetUserId, requestedLimit, { allowInactive: true, source: "manual" });
  }

  const users = await prisma.user.findMany({
    where: { active: true, crmEnabled: true, leads: { some: {} } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const results: Array<
    | { userId: string; userName: string; ok: true; result: Awaited<ReturnType<typeof executeAutomationForUser>> }
    | { userId: string; userName: string; ok: false; error: string }
  > = [];
  for (const user of users) {
    try {
      results.push({ userId: user.id, userName: user.name, ok: true, result: await executeAutomationForUser(automationId, user.id, requestedLimit, { allowInactive: true, source: "manual" }) });
    } catch (error) {
      results.push({ userId: user.id, userName: user.name, ok: false, error: error instanceof Error ? error.message : "Falha na execução." });
    }
  }
  return {
    automationId,
    executed: results.some((item) => item.ok),
    scope: "all_crms",
    users: results,
    sent: results.reduce((total, item) => total + (item.ok && "sent" in item.result ? Number(item.result.sent) : 0), 0),
    errors: results.filter((item) => !item.ok).length + results.reduce((total, item) => total + (item.ok && "errors" in item.result ? Number(item.result.errors) : 0), 0),
  };
}
