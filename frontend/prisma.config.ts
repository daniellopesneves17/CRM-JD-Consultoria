// Configuração do Prisma CLI; migrations usam DIRECT_URL e o cliente usa DATABASE_URL.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ""
  }
});
