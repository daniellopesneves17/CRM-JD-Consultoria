import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(process.cwd(), "../.env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const configuredDirectUrl = process.env.DIRECT_URL;
const directUrl =
  configuredDirectUrl === "${DATABASE_URL}"
    ? databaseUrl
    : configuredDirectUrl || databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    // `prisma generate` only needs the schema. Database commands still fail with
    // Prisma's own connection error when neither URL is configured.
    url: directUrl ?? ""
  }
});
