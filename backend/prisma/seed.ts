// Cria somente a conta administrativa inicial; não insere dados comerciais fictícios.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD são obrigatórios.");
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {},
    create: { name: "Daniel Lopes", email: adminEmail.toLowerCase(), passwordHash, role: Role.ADMIN }
  });
  await prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
}

main()
  .then(() => console.log("Conta administrativa inicial pronta."))
  .catch((error: unknown) => {
    console.error("Falha ao criar a conta administrativa:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
