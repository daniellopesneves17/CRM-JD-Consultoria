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
