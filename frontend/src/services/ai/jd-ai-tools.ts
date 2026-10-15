import {
  LeadSource,
  PipelineStage,
  Prisma,
  ProposalStatus,
  Role,
  TaskType,
  Temperature,
} from "@prisma/client";
import type { FunctionTool } from "openai/resources/responses/responses";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone, sendText } from "@/services/uazapi";

export type JdAiActor = { id: string; role: Role; name?: string | null; email?: string | null };
type ToolContext = { actor: JdAiActor; userMessage: string };

const nullableString = { type: ["string", "null"] } as const;
const nullableNumber = { type: ["number", "null"] } as const;
const nullableBoolean = { type: ["boolean", "null"] } as const;

export const JD_AI_CRM_TOOLS: FunctionTool[] = [
  {
    type: "function",
    name: "crm_obter_visao_geral",
    description: "Consulta indicadores reais do CRM no período, respeitando a carteira e o papel do usuário atual.",
    strict: true,
    parameters: {
      type: "object",
      properties: { period_days: { type: "integer", minimum: 1, maximum: 365 } },
      required: ["period_days"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_consultar",
    description: "Pesquisa registros reais do CRM. Use lead_detalhado quando precisar do histórico completo de um lead.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        recurso: { type: "string", enum: ["leads", "lead_detalhado", "tarefas", "propostas", "conversas", "automacoes", "usuarios", "metas", "configuracoes"] },
        busca: nullableString,
        status: nullableString,
        id: nullableString,
        limite: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: ["recurso", "busca", "status", "id", "limite"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_salvar_lead",
    description: "Cria ou atualiza um lead. Para criar, omita id e informe nome e telefone. Para atualizar, informe id e somente os campos desejados.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        id: nullableString,
        nome: nullableString,
        telefone: nullableString,
        email: nullableString,
        vidas: nullableNumber,
        etapa: { type: ["string", "null"], enum: [...Object.values(PipelineStage), null] },
        temperatura: { type: ["string", "null"], enum: [...Object.values(Temperature), null] },
        origem: { type: ["string", "null"], enum: [...Object.values(LeadSource), null] },
        valor_estimado: nullableNumber,
        observacoes: nullableString,
        motivo_perda: nullableString,
        usuario_responsavel_id: nullableString,
        limpar_campos: { type: "array", items: { type: "string", enum: ["email", "valor_estimado", "observacoes", "motivo_perda", "usuario_responsavel_id"] } },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_salvar_tarefa",
    description: "Cria, atualiza ou conclui uma tarefa vinculada a um lead acessível.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        id: nullableString,
        lead_id: nullableString,
        titulo: nullableString,
        descricao: nullableString,
        vencimento: nullableString,
        tipo: { type: ["string", "null"], enum: [...Object.values(TaskType), null] },
        concluida: nullableBoolean,
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_salvar_proposta",
    description: "Cria ou atualiza uma proposta. Esta ferramenta não envia a proposta ao cliente.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        id: nullableString,
        lead_id: nullableString,
        operadora: nullableString,
        plano: nullableString,
        cobertura: nullableString,
        valor_mensal: nullableNumber,
        vidas: { type: ["array", "null"], items: { type: "object", properties: { name: { type: "string" }, age: nullableNumber, value: nullableNumber }, required: ["name"], additionalProperties: false } },
        status: { type: ["string", "null"], enum: [...Object.values(ProposalStatus), null] },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_salvar_meta",
    description: "Cria ou atualiza uma meta mensal. Administradores podem informar usuario_id; corretores alteram apenas a própria meta.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        usuario_id: nullableString,
        mes: { type: "integer", minimum: 1, maximum: 12 },
        ano: { type: "integer", minimum: 2020, maximum: 2100 },
        valor_meta: { type: "number", exclusiveMinimum: 0 },
        valor_atual: nullableNumber,
      },
      required: ["mes", "ano", "valor_meta"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_salvar_automacao",
    description: "Cria ou atualiza disparadores e automações. Exclusivo para administradores. Ativar uma regra exige confirmação explícita.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        id: nullableString,
        nome: nullableString,
        descricao: nullableString,
        gatilho: nullableString,
        atraso_horas: nullableNumber,
        modelo_mensagem: nullableString,
        modelo_ia: nullableString,
        configuracao: { type: ["object", "null"], additionalProperties: true },
        ativa: nullableBoolean,
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_salvar_configuracao",
    description: "Altera configurações da empresa, do sistema, operadoras ou biblioteca de objeções. Exclusivo para administradores.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        secao: { type: "string", enum: ["empresa", "sistema", "operadora", "objecao"] },
        id: nullableString,
        alteracoes: { type: "object", additionalProperties: true },
      },
      required: ["secao", "alteracoes"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_atualizar_usuario",
    description: "Atualiza cadastro, papel e acesso de um usuário. Exclusivo para administradores; mudanças de papel ou acesso exigem confirmação explícita.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        nome: nullableString,
        email: nullableString,
        telefone: nullableString,
        papel: { type: ["string", "null"], enum: [...Object.values(Role), null] },
        ativo: nullableBoolean,
        crm_habilitado: nullableBoolean,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_enviar_whatsapp",
    description: "Envia uma mensagem real pelo WhatsApp e a registra na conversa. Exige que a mensagem atual do usuário comece com CONFIRMAR.",
    strict: true,
    parameters: {
      type: "object",
      properties: { conversa_id: { type: "string" }, mensagem: { type: "string", minLength: 1, maxLength: 4000 } },
      required: ["conversa_id", "mensagem"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "crm_excluir",
    description: "Exclui um registro real do CRM. Exige que a mensagem atual do usuário comece com CONFIRMAR.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        recurso: { type: "string", enum: ["lead", "tarefa", "proposta", "automacao", "operadora", "objecao"] },
        id: { type: "string" },
      },
      required: ["recurso", "id"],
      additionalProperties: false,
    },
  },
];

export function hasExplicitJdAiConfirmation(message: string) {
  return /^\s*CONFIRMAR(?:\b|\s|:|-)/i.test(message);
}

function assertAdmin(actor: JdAiActor) {
  if (actor.role !== Role.ADMIN) throw new Error("Esta ação é exclusiva para administradores.");
}

function assertConfirmed(context: ToolContext, summary: string) {
  if (!hasExplicitJdAiConfirmation(context.userMessage)) {
    throw new Error(`CONFIRMACAO_NECESSARIA: ${summary}. Peça ao usuário para revisar os dados e responder começando com \"CONFIRMAR\".`);
  }
}

function leadScope(actor: JdAiActor) {
  return actor.role === Role.ADMIN ? {} : { userId: actor.id };
}

async function accessibleLead(id: string, actor: JdAiActor) {
  const lead = await prisma.lead.findFirst({ where: { id, ...leadScope(actor) }, select: { id: true, name: true, userId: true } });
  if (!lead) throw new Error("Lead não encontrado ou fora do seu escopo.");
  return lead;
}

async function audit(actor: JdAiActor, detail: string) {
  await prisma.accessLog.create({ data: { userId: actor.id, action: "jd_ai_action", detail } });
}

function json(value: unknown) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

async function overview(raw: unknown, actor: JdAiActor) {
  const { period_days } = z.object({ period_days: z.number().int().min(1).max(365) }).parse(raw);
  const since = new Date(Date.now() - period_days * 86_400_000);
  const scope = leadScope(actor);
  const [totalLeads, newLeads, stages, overdueTasks, proposals, recentLeads] = await Promise.all([
    prisma.lead.count({ where: scope }),
    prisma.lead.count({ where: { ...scope, createdAt: { gte: since } } }),
    prisma.lead.groupBy({ by: ["stage"], where: scope, _count: { _all: true } }),
    prisma.task.count({ where: { done: false, dueAt: { lt: new Date() }, lead: scope } }),
    prisma.proposal.findMany({ where: { createdAt: { gte: since }, lead: scope }, select: { status: true, monthlyValue: true } }),
    prisma.lead.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, stage: true, temperature: true, estimatedValue: true, updatedAt: true } }),
  ]);
  return {
    periodoDias: period_days,
    totalLeads,
    novosLeads: newLeads,
    pipeline: stages.map((item) => ({ etapa: item.stage, total: item._count._all })),
    tarefasAtrasadas: overdueTasks,
    propostasNoPeriodo: proposals.length,
    propostasAceitas: proposals.filter((item) => item.status === ProposalStatus.ACEITA).length,
    receitaMensalAceita: proposals.filter((item) => item.status === ProposalStatus.ACEITA).reduce((sum, item) => sum + Number(item.monthlyValue), 0),
    leadsRecentes: recentLeads,
  };
}

const querySchema = z.object({
  recurso: z.enum(["leads", "lead_detalhado", "tarefas", "propostas", "conversas", "automacoes", "usuarios", "metas", "configuracoes"]),
  busca: z.string().nullable(), status: z.string().nullable(), id: z.string().nullable(), limite: z.number().int().min(1).max(100),
});

async function queryCrm(raw: unknown, actor: JdAiActor) {
  const args = querySchema.parse(raw);
  const insensitive = "insensitive" as const;
  if (args.recurso === "lead_detalhado") {
    if (!args.id) throw new Error("Informe o id do lead.");
    return prisma.lead.findFirst({
      where: { id: args.id, ...leadScope(actor) },
      select: {
        id: true, name: true, phone: true, email: true, birthDate: true, livesCount: true, stage: true, score: true,
        temperature: true, estimatedValue: true, source: true, notes: true, lastActivityAt: true, lostReason: true,
        currentOperator: true, contractEndDate: true, assignedTo: { select: { id: true, name: true } },
        tasks: { orderBy: { dueAt: "asc" }, take: 30 }, proposals: { orderBy: { createdAt: "desc" }, take: 20 },
        conversations: { orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, status: true, sentiment: true, aiSummary: true, updatedAt: true, messages: { orderBy: { sentAt: "desc" }, take: 20, select: { id: true, sender: true, content: true, type: true, sentAt: true } } } },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
  }
  if (args.recurso === "leads") {
    const stage = args.status && Object.values(PipelineStage).includes(args.status as PipelineStage) ? args.status as PipelineStage : undefined;
    return prisma.lead.findMany({ where: { ...leadScope(actor), stage, ...(args.busca ? { OR: [{ name: { contains: args.busca, mode: insensitive } }, { phone: { contains: args.busca } }, { email: { contains: args.busca, mode: insensitive } }] } : {}) }, orderBy: { updatedAt: "desc" }, take: args.limite, select: { id: true, name: true, phone: true, email: true, stage: true, temperature: true, score: true, livesCount: true, estimatedValue: true, lastActivityAt: true, assignedTo: { select: { id: true, name: true } } } });
  }
  if (args.recurso === "tarefas") {
    const now = new Date();
    const statusWhere = args.status === "concluida" ? { done: true } : args.status === "atrasada" ? { done: false, dueAt: { lt: now } } : args.status === "pendente" ? { done: false } : {};
    return prisma.task.findMany({ where: { ...statusWhere, lead: { ...leadScope(actor), ...(args.busca ? { name: { contains: args.busca, mode: insensitive } } : {}) } }, include: { lead: { select: { id: true, name: true, stage: true } } }, orderBy: { dueAt: "asc" }, take: args.limite });
  }
  if (args.recurso === "propostas") {
    const status = args.status && Object.values(ProposalStatus).includes(args.status as ProposalStatus) ? args.status as ProposalStatus : undefined;
    return prisma.proposal.findMany({ where: { status, lead: { ...leadScope(actor), ...(args.busca ? { name: { contains: args.busca, mode: insensitive } } : {}) } }, include: { lead: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: "desc" }, take: args.limite });
  }
  if (args.recurso === "conversas") {
    return prisma.conversation.findMany({ where: { ...(args.status ? { status: args.status as "BOT" | "HUMANO" | "ENCERRADO" } : {}), lead: { ...leadScope(actor), ...(args.busca ? { name: { contains: args.busca, mode: insensitive } } : {}) } }, include: { lead: { select: { id: true, name: true, phone: true } }, messages: { orderBy: { sentAt: "desc" }, take: 5, select: { sender: true, content: true, sentAt: true } } }, orderBy: { updatedAt: "desc" }, take: args.limite });
  }
  if (args.recurso === "metas") {
    return prisma.goal.findMany({ where: actor.role === Role.ADMIN ? {} : { userId: actor.id }, include: { user: { select: { id: true, name: true } } }, orderBy: [{ year: "desc" }, { month: "desc" }], take: args.limite });
  }
  assertAdmin(actor);
  if (args.recurso === "automacoes") return prisma.automationRule.findMany({ where: args.busca ? { name: { contains: args.busca, mode: insensitive } } : {}, orderBy: { createdAt: "asc" }, take: args.limite });
  if (args.recurso === "usuarios") return prisma.user.findMany({ where: args.busca ? { OR: [{ name: { contains: args.busca, mode: insensitive } }, { email: { contains: args.busca, mode: insensitive } }] } : {}, orderBy: { name: "asc" }, take: args.limite, select: { id: true, name: true, email: true, phone: true, role: true, active: true, crmEnabled: true, lastLoginAt: true, loginCount: true, createdAt: true, _count: { select: { leads: true } } } });
  const [company, system, operators, objections] = await Promise.all([prisma.companySettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }), prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }), prisma.operator.findMany({ orderBy: { name: "asc" } }), prisma.objectionLibrary.findMany({ orderBy: { createdAt: "asc" } })]);
  return { company, system, operators, objections };
}

const saveLeadSchema = z.object({
  id: z.string().nullable().optional(), nome: z.string().min(2).max(120).nullable().optional(), telefone: z.string().min(8).max(24).nullable().optional(),
  email: z.string().email().nullable().optional(), vidas: z.number().int().min(1).max(100).nullable().optional(), etapa: z.nativeEnum(PipelineStage).nullable().optional(),
  temperatura: z.nativeEnum(Temperature).nullable().optional(), origem: z.nativeEnum(LeadSource).nullable().optional(), valor_estimado: z.number().nonnegative().nullable().optional(),
  observacoes: z.string().max(4000).nullable().optional(), motivo_perda: z.string().max(1000).nullable().optional(), usuario_responsavel_id: z.string().nullable().optional(),
  limpar_campos: z.array(z.enum(["email", "valor_estimado", "observacoes", "motivo_perda", "usuario_responsavel_id"])).default([]),
});

async function saveLead(raw: unknown, actor: JdAiActor) {
  const args = saveLeadSchema.parse(raw);
  if (!args.id) {
    if (!args.nome || !args.telefone) throw new Error("Nome e telefone são obrigatórios para criar um lead.");
    const assignedId = actor.role === Role.ADMIN ? args.usuario_responsavel_id ?? actor.id : actor.id;
    const lead = await prisma.lead.create({ data: { name: args.nome, phone: normalizePhone(args.telefone), email: args.email ?? null, livesCount: args.vidas ?? 1, stage: args.etapa ?? PipelineStage.NOVO, temperature: args.temperatura ?? Temperature.FRIO, source: args.origem ?? LeadSource.WHATSAPP, estimatedValue: args.valor_estimado, notes: args.observacoes, userId: assignedId, lastActivityAt: new Date() } });
    await audit(actor, `JD AI criou o lead ${lead.name} (${lead.id}).`);
    return lead;
  }
  await accessibleLead(args.id, actor);
  const data: Prisma.LeadUpdateInput = { lastActivityAt: new Date() };
  if (args.nome != null) data.name = args.nome;
  if (args.telefone != null) data.phone = normalizePhone(args.telefone);
  if (args.email != null) data.email = args.email;
  if (args.vidas != null) data.livesCount = args.vidas;
  if (args.etapa != null) data.stage = args.etapa;
  if (args.temperatura != null) data.temperature = args.temperatura;
  if (args.origem != null) data.source = args.origem;
  if (args.valor_estimado != null) data.estimatedValue = args.valor_estimado;
  if (args.observacoes != null) data.notes = args.observacoes;
  if (args.motivo_perda != null) data.lostReason = args.motivo_perda;
  if (actor.role === Role.ADMIN && args.usuario_responsavel_id != null) data.assignedTo = { connect: { id: args.usuario_responsavel_id } };
  for (const field of args.limpar_campos) {
    if (field === "email") data.email = null;
    if (field === "valor_estimado") data.estimatedValue = null;
    if (field === "observacoes") data.notes = null;
    if (field === "motivo_perda") data.lostReason = null;
    if (field === "usuario_responsavel_id" && actor.role === Role.ADMIN) data.assignedTo = { disconnect: true };
  }
  const lead = await prisma.lead.update({ where: { id: args.id }, data });
  await Promise.all([audit(actor, `JD AI atualizou o lead ${lead.name} (${lead.id}).`), prisma.activity.create({ data: { leadId: lead.id, type: "jd_ai_update", detail: `Lead atualizado pela JD AI a pedido de ${actor.name || actor.email || actor.id}.` } })]);
  return lead;
}

const saveTaskSchema = z.object({ id: z.string().nullable().optional(), lead_id: z.string().nullable().optional(), titulo: z.string().min(2).max(160).nullable().optional(), descricao: z.string().max(1000).nullable().optional(), vencimento: z.coerce.date().nullable().optional(), tipo: z.nativeEnum(TaskType).nullable().optional(), concluida: z.boolean().nullable().optional() });
async function saveTask(raw: unknown, actor: JdAiActor) {
  const args = saveTaskSchema.parse(raw);
  if (!args.id) {
    if (!args.lead_id || !args.titulo || !args.vencimento) throw new Error("Lead, título e vencimento são obrigatórios para criar a tarefa.");
    await accessibleLead(args.lead_id, actor);
    const task = await prisma.task.create({ data: { leadId: args.lead_id, title: args.titulo, description: args.descricao, dueAt: args.vencimento, type: args.tipo ?? TaskType.FOLLOWUP } });
    await audit(actor, `JD AI criou a tarefa ${task.title} (${task.id}).`);
    return task;
  }
  const current = await prisma.task.findFirst({ where: { id: args.id, lead: leadScope(actor) } });
  if (!current) throw new Error("Tarefa não encontrada ou fora do seu escopo.");
  const task = await prisma.task.update({ where: { id: args.id }, data: { title: args.titulo ?? undefined, description: args.descricao === null ? undefined : args.descricao, dueAt: args.vencimento ?? undefined, type: args.tipo ?? undefined, done: args.concluida ?? undefined, ...(args.concluida === true ? { doneAt: new Date() } : args.concluida === false ? { doneAt: null } : {}) } });
  await audit(actor, `JD AI atualizou a tarefa ${task.title} (${task.id}).`);
  return task;
}

const lifeSchema = z.object({ name: z.string().min(2), age: z.number().int().min(0).max(120).nullable().optional(), value: z.number().nonnegative().nullable().optional() });
const saveProposalSchema = z.object({ id: z.string().nullable().optional(), lead_id: z.string().nullable().optional(), operadora: z.string().min(2).max(120).nullable().optional(), plano: z.string().min(2).max(120).nullable().optional(), cobertura: z.string().min(2).max(500).nullable().optional(), valor_mensal: z.number().positive().nullable().optional(), vidas: z.array(lifeSchema).min(1).nullable().optional(), status: z.nativeEnum(ProposalStatus).nullable().optional() });
async function saveProposal(raw: unknown, actor: JdAiActor) {
  const args = saveProposalSchema.parse(raw);
  if (!args.id) {
    if (!args.lead_id || !args.operadora || !args.plano || !args.cobertura || !args.valor_mensal || !args.vidas) throw new Error("Lead, operadora, plano, cobertura, valor mensal e vidas são obrigatórios.");
    await accessibleLead(args.lead_id, actor);
    const proposal = await prisma.proposal.create({ data: { leadId: args.lead_id, operator: args.operadora, plan: args.plano, coverage: args.cobertura, monthlyValue: args.valor_mensal, lives: args.vidas as Prisma.InputJsonValue, status: args.status ?? ProposalStatus.RASCUNHO } });
    await audit(actor, `JD AI criou a proposta ${proposal.id}.`);
    return proposal;
  }
  const current = await prisma.proposal.findFirst({ where: { id: args.id, lead: leadScope(actor) } });
  if (!current) throw new Error("Proposta não encontrada ou fora do seu escopo.");
  const proposal = await prisma.proposal.update({ where: { id: args.id }, data: { operator: args.operadora ?? undefined, plan: args.plano ?? undefined, coverage: args.cobertura ?? undefined, monthlyValue: args.valor_mensal ?? undefined, lives: args.vidas ? args.vidas as Prisma.InputJsonValue : undefined, status: args.status ?? undefined, ...(args.status === ProposalStatus.ACEITA ? { acceptedAt: new Date() } : {}) } });
  await audit(actor, `JD AI atualizou a proposta ${proposal.id}.`);
  return proposal;
}

async function saveGoal(raw: unknown, actor: JdAiActor) {
  const args = z.object({ usuario_id: z.string().nullable().optional(), mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020).max(2100), valor_meta: z.number().positive(), valor_atual: z.number().nonnegative().nullable().optional() }).parse(raw);
  const userId = actor.role === Role.ADMIN && args.usuario_id ? args.usuario_id : actor.id;
  const goal = await prisma.goal.upsert({ where: { userId_month_year: { userId, month: args.mes, year: args.ano } }, update: { targetValue: args.valor_meta, ...(args.valor_atual != null ? { currentValue: args.valor_atual } : {}) }, create: { userId, month: args.mes, year: args.ano, targetValue: args.valor_meta, currentValue: args.valor_atual ?? 0 } });
  await audit(actor, `JD AI salvou a meta ${args.mes}/${args.ano} do usuário ${userId}.`);
  return goal;
}

const saveAutomationSchema = z.object({ id: z.string().nullable().optional(), nome: z.string().min(2).max(120).nullable().optional(), descricao: z.string().max(500).nullable().optional(), gatilho: z.string().min(2).max(120).nullable().optional(), atraso_horas: z.number().int().min(0).max(8760).nullable().optional(), modelo_mensagem: z.string().min(2).max(4000).nullable().optional(), modelo_ia: z.string().min(2).max(120).nullable().optional(), configuracao: z.record(z.string(), z.unknown()).nullable().optional(), ativa: z.boolean().nullable().optional() });
async function saveAutomation(raw: unknown, context: ToolContext) {
  assertAdmin(context.actor);
  const args = saveAutomationSchema.parse(raw);
  if (args.ativa === true) assertConfirmed(context, `ativar a automação ${args.nome || args.id || "informada"}`);
  if (!args.id) {
    if (!args.nome || !args.gatilho || args.atraso_horas == null || !args.modelo_mensagem) throw new Error("Nome, gatilho, atraso e modelo da mensagem são obrigatórios.");
    const item = await prisma.automationRule.create({ data: { name: args.nome, description: args.descricao ?? "", trigger: args.gatilho, delayHours: args.atraso_horas, template: args.modelo_mensagem, model: args.modelo_ia ?? "gpt-4o", config: args.configuracao as Prisma.InputJsonValue | undefined, active: args.ativa ?? false } });
    await audit(context.actor, `JD AI criou a automação ${item.name} (${item.id}).`);
    return item;
  }
  const item = await prisma.automationRule.update({ where: { id: args.id }, data: { name: args.nome ?? undefined, description: args.descricao ?? undefined, trigger: args.gatilho ?? undefined, delayHours: args.atraso_horas ?? undefined, template: args.modelo_mensagem ?? undefined, model: args.modelo_ia ?? undefined, config: args.configuracao ? args.configuracao as Prisma.InputJsonValue : undefined, active: args.ativa ?? undefined } });
  await audit(context.actor, `JD AI atualizou a automação ${item.name} (${item.id}).`);
  return item;
}

const companyChanges = z.object({ name: z.string().min(2).max(120).optional(), cnpj: z.string().max(24).nullable().optional(), susep: z.string().max(40).nullable().optional(), address: z.string().max(300).nullable().optional(), phone: z.string().max(30).nullable().optional(), email: z.string().email().nullable().optional(), website: z.string().url().nullable().optional(), personaName: z.string().min(2).max(40).optional(), personaTone: z.enum(["formal", "friendly", "casual"]).optional(), botStartHour: z.number().int().min(0).max(23).optional(), botEndHour: z.number().int().min(0).max(23).optional(), welcomeMessage: z.string().max(300).nullable().optional(), offHoursMessage: z.string().max(200).nullable().optional() });
async function saveSettings(raw: unknown, context: ToolContext) {
  assertAdmin(context.actor);
  const args = z.object({ secao: z.enum(["empresa", "sistema", "operadora", "objecao"]), id: z.string().nullable().optional(), alteracoes: z.record(z.string(), z.unknown()) }).parse(raw);
  let result: unknown;
  if (args.secao === "empresa") result = await prisma.companySettings.upsert({ where: { id: "default" }, update: companyChanges.parse(args.alteracoes), create: { id: "default", ...companyChanges.parse(args.alteracoes) } });
  else if (args.secao === "sistema") {
    const changes = z.object({ crmEnabled: z.boolean().optional(), updatePolicy: z.enum(["AUTOMATIC", "ON_COMPLETION"]).optional(), maintenanceMessage: z.string().min(3).max(240).optional() }).parse(args.alteracoes);
    if (changes.crmEnabled === false) assertConfirmed(context, "desabilitar o CRM para os corretores");
    result = await prisma.systemSettings.upsert({ where: { id: "global" }, update: changes, create: { id: "global", ...changes } });
  } else if (args.secao === "operadora") {
    const changes = z.object({ name: z.string().min(2).max(100), commercialContact: z.string().max(160).nullable().optional(), notes: z.string().max(500).nullable().optional(), active: z.boolean().optional() }).parse(args.alteracoes);
    result = args.id ? await prisma.operator.update({ where: { id: args.id }, data: changes }) : await prisma.operator.create({ data: changes });
  } else {
    const changes = z.object({ objection: z.string().min(2).max(200), response: z.string().min(2).max(1000), active: z.boolean().optional() }).parse(args.alteracoes);
    result = args.id ? await prisma.objectionLibrary.update({ where: { id: args.id }, data: changes }) : await prisma.objectionLibrary.create({ data: changes });
  }
  await audit(context.actor, `JD AI atualizou a seção ${args.secao} das configurações.`);
  return result;
}

async function updateUser(raw: unknown, context: ToolContext) {
  assertAdmin(context.actor);
  const args = z.object({ id: z.string(), nome: z.string().min(2).max(120).nullable().optional(), email: z.string().email().nullable().optional(), telefone: z.string().max(30).nullable().optional(), papel: z.nativeEnum(Role).nullable().optional(), ativo: z.boolean().nullable().optional(), crm_habilitado: z.boolean().nullable().optional() }).parse(raw);
  if (args.id === context.actor.id) throw new Error("A JD AI não pode alterar a conta administrativa que está em uso.");
  if (args.papel != null || args.ativo != null || args.crm_habilitado != null) assertConfirmed(context, `alterar papel ou acesso do usuário ${args.id}`);
  const current = await prisma.user.findUnique({ where: { id: args.id }, select: { id: true, role: true, active: true } });
  if (!current) throw new Error("Usuário não encontrado.");
  if (current.role === Role.ADMIN && current.active && (args.papel === Role.CORRETOR || args.ativo === false)) {
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, active: true } });
    if (activeAdmins <= 1) throw new Error("O último administrador ativo não pode ser desativado ou rebaixado.");
  }
  const user = await prisma.user.update({ where: { id: args.id }, data: { name: args.nome ?? undefined, email: args.email ?? undefined, phone: args.telefone === null ? null : args.telefone, role: args.papel ?? undefined, active: args.ativo ?? undefined, crmEnabled: args.crm_habilitado ?? undefined, ...((args.ativo === false || args.crm_habilitado === false) ? { sessionVersion: { increment: 1 } } : {}) }, select: { id: true, name: true, email: true, phone: true, role: true, active: true, crmEnabled: true, updatedAt: true } });
  await audit(context.actor, `JD AI atualizou o usuário ${user.name} (${user.id}).`);
  return user;
}

async function sendWhatsApp(raw: unknown, context: ToolContext) {
  const args = z.object({ conversa_id: z.string(), mensagem: z.string().trim().min(1).max(4000) }).parse(raw);
  assertConfirmed(context, `enviar ao cliente a mensagem: ${args.mensagem}`);
  const conversation = await prisma.conversation.findFirst({ where: { id: args.conversa_id, lead: leadScope(context.actor) }, include: { lead: { select: { id: true, name: true, phone: true } } } });
  if (!conversation) throw new Error("Conversa não encontrada ou fora do seu escopo.");
  await sendText(conversation.lead.phone, args.mensagem);
  const message = await prisma.message.create({ data: { conversationId: conversation.id, sender: "CORRETOR", content: args.mensagem, userId: context.actor.id } });
  await Promise.all([prisma.lead.update({ where: { id: conversation.lead.id }, data: { lastActivityAt: new Date() } }), audit(context.actor, `JD AI enviou WhatsApp para ${conversation.lead.name} na conversa ${conversation.id}.`)]);
  return { enviado: true, lead: conversation.lead.name, mensagemId: message.id, enviadoEm: message.sentAt };
}

async function deleteRecord(raw: unknown, context: ToolContext) {
  const args = z.object({ recurso: z.enum(["lead", "tarefa", "proposta", "automacao", "operadora", "objecao"]), id: z.string() }).parse(raw);
  assertConfirmed(context, `excluir ${args.recurso} ${args.id}`);
  if (args.recurso === "lead") {
    await accessibleLead(args.id, context.actor);
    await prisma.lead.delete({ where: { id: args.id } });
  } else if (args.recurso === "tarefa") {
    const item = await prisma.task.findFirst({ where: { id: args.id, lead: leadScope(context.actor) } });
    if (!item) throw new Error("Tarefa não encontrada ou fora do seu escopo.");
    await prisma.task.delete({ where: { id: args.id } });
  } else if (args.recurso === "proposta") {
    const item = await prisma.proposal.findFirst({ where: { id: args.id, lead: leadScope(context.actor) } });
    if (!item) throw new Error("Proposta não encontrada ou fora do seu escopo.");
    await prisma.proposal.delete({ where: { id: args.id } });
  } else {
    assertAdmin(context.actor);
    if (args.recurso === "automacao") await prisma.automationRule.delete({ where: { id: args.id } });
    if (args.recurso === "operadora") await prisma.operator.delete({ where: { id: args.id } });
    if (args.recurso === "objecao") await prisma.objectionLibrary.delete({ where: { id: args.id } });
  }
  await audit(context.actor, `JD AI excluiu ${args.recurso} ${args.id}.`);
  return { excluido: true, recurso: args.recurso, id: args.id };
}

export async function executeJdAiCrmTool(name: string, rawArguments: string, context: ToolContext) {
  try {
    const args = JSON.parse(rawArguments) as unknown;
    let result: unknown;
    if (name === "crm_obter_visao_geral") result = await overview(args, context.actor);
    else if (name === "crm_consultar") result = await queryCrm(args, context.actor);
    else if (name === "crm_salvar_lead") result = await saveLead(args, context.actor);
    else if (name === "crm_salvar_tarefa") result = await saveTask(args, context.actor);
    else if (name === "crm_salvar_proposta") result = await saveProposal(args, context.actor);
    else if (name === "crm_salvar_meta") result = await saveGoal(args, context.actor);
    else if (name === "crm_salvar_automacao") result = await saveAutomation(args, context);
    else if (name === "crm_salvar_configuracao") result = await saveSettings(args, context);
    else if (name === "crm_atualizar_usuario") result = await updateUser(args, context);
    else if (name === "crm_enviar_whatsapp") result = await sendWhatsApp(args, context);
    else if (name === "crm_excluir") result = await deleteRecord(args, context);
    else throw new Error(`Ferramenta desconhecida: ${name}`);
    return json({ ok: true, result });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Falha ao executar a ferramenta do CRM." });
  }
}
