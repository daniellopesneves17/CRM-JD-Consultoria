// Seed seguro: cria o administrador e, somente com SEED_DEMO_DATA=true, dados demonstrativos.
import { PrismaClient, LeadSource, PipelineStage, Role, Temperature } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoLeads = [
  ["Mariana Souza", "+5522998111001", PipelineStage.NOVO, 28, Temperature.FRIO, LeadSource.WHATSAPP],
  ["Carlos Henrique", "+5522998111002", PipelineStage.QUALIFICADO, 74, Temperature.QUENTE, LeadSource.INDICACAO],
  ["Fernanda Alves", "+5522998111003", PipelineStage.PROPOSTA_ENVIADA, 82, Temperature.QUENTE, LeadSource.FORMULARIO],
  ["Rafael Martins", "+5522998111004", PipelineStage.EM_ANALISE, 63, Temperature.MORNO, LeadSource.WHATSAPP],
  ["Juliana Ribeiro", "+5522998111005", PipelineStage.NEGOCIACAO, 91, Temperature.QUENTE, LeadSource.LIGACAO],
  ["Roberto Lima", "+5522998111006", PipelineStage.PERDIDO, 19, Temperature.FRIO, LeadSource.IMPORTACAO]
] as const;

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "danilopesedu11@gmail.com").toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) throw new Error("Defina ADMIN_INITIAL_PASSWORD com pelo menos 8 caracteres.");

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, active: true, crmEnabled: true },
    create: { name: "Daniel Lopes", email: adminEmail, passwordHash, role: Role.ADMIN }
  });
  await prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });

  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "JD Consultoria e Vendas",
      address: "Campos dos Goytacazes, RJ",
      personaName: "Ana",
      personaTone: "friendly",
      botStartHour: 8,
      botEndHour: 20,
      welcomeMessage: "Olá! Aqui é a Ana da JD Consultoria. Que ótimo ter você aqui! Posso ajudar a encontrar o plano de saúde ideal para você e sua família. Você busca um plano individual ou para mais pessoas?",
      offHoursMessage: "Olá! No momento estou fora do horário de atendimento, das 8h às 20h. Sua mensagem foi recebida e retorno assim que possível!"
    }
  });

  for (const name of ["Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "NotreDame Intermédica", "Porto Seguro Saúde"]) {
    await prisma.operator.upsert({ where: { name }, update: {}, create: { name, active: true } });
  }

  const objections = [
    { objection: "É muito caro", response: "Entendo sua preocupação com o valor. Quanto você costuma gastar por mês em consultas e exames avulsos? Muitas vezes o plano é mais econômico no médio prazo." },
    { objection: "Vou pensar", response: "Claro, faz sentido pensar bem. Ficou alguma dúvida específica? Uma informação a mais pode ajudar na decisão." },
    { objection: "Já tenho plano", response: "Que bom! Você está satisfeito com a cobertura e o atendimento? Às vezes há opções com cobertura melhor pelo mesmo valor." },
    { objection: "Manda no WhatsApp", response: "Claro! Vou enviar agora. Posso entrar em contato depois para saber se ficou alguma dúvida?" },
    { objection: "Não tenho interesse", response: "Sem problema, respeito sua decisão. Posso guardar seu contato caso precise no futuro?" }
  ];
  for (const item of objections) {
    await prisma.objectionLibrary.upsert({ where: { objection: item.objection }, update: { response: item.response }, create: item });
  }

  const automations = [
    { id: "pre-attendance", name: "Pré-atendimento IA", description: "Responde automaticamente novos leads no WhatsApp.", trigger: "new_message", delayHours: 0, template: "Atendimento inicial humanizado", model: "gpt-4o", config: { startHour: "08:00", endHour: "20:00" } },
    { id: "proposal-follow-up", name: "Follow-up após proposta", description: "Retoma contatos que não responderam à proposta.", trigger: "proposal_sent_no_response", delayHours: 24, template: "Follow-up consultivo", model: "gpt-4o", config: { days: [1, 3, 7] } },
    { id: "base-reactivation", name: "Reativação de base", description: "Contata leads frios e inativos.", trigger: "inactive_lead", delayHours: 720, template: "Reativação personalizada", model: "o3 + gpt-4o", config: { inactiveDays: 30, dailyLimit: 15 } },
    { id: "sentiment-analysis", name: "Análise de sentimento", description: "Classifica o tom das mensagens recebidas.", trigger: "incoming_message_sentiment", delayHours: 0, template: "Classificação de sentimento", model: "gpt-4o-mini", config: {} },
    { id: "automatic-score", name: "Score automático de leads", description: "Recalcula a pontuação dos leads a cada quatro horas.", trigger: "periodic_score", delayHours: 4, template: "Score comercial", model: "o3", config: { reasoningEffort: "low" } },
    { id: "conversation-summary", name: "Resumo de conversa", description: "Gera resumo executivo ao encerrar uma conversa.", trigger: "conversation_closed", delayHours: 0, template: "Resumo executivo", model: "o3", config: {} }
  ];
  for (const item of automations) {
    await prisma.automationRule.upsert({ where: { id: item.id }, update: item, create: item });
  }

  if (process.env.SEED_DEMO_DATA !== "true") return;
  for (const [name, phone, stage, score, temperature, source] of demoLeads) {
    await prisma.lead.upsert({
      where: { phone },
      update: {},
      create: {
        name, phone, stage, score, temperature, source, userId: admin.id,
        livesCount: 1 + (score % 4), estimatedValue: 300 + score * 8,
        lastActivityAt: new Date(Date.now() - (score < 40 ? 3 : 1) * 86_400_000)
      }
    });
  }
}

main()
  .then(() => console.log("Seed concluído com segurança."))
  .catch((error: unknown) => {
    console.error("Falha ao preparar o banco:", error instanceof Error ? error.message : "erro desconhecido");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
