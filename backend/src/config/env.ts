// Valida e centraliza variáveis de ambiente. Erros impedem inicialização insegura.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// No desenvolvimento local, compartilha o .env da raiz. Um backend/.env opcional tem prioridade.
dotenv.config({ path: path.resolve(backendRoot, "../.env"), quiet: true });
dotenv.config({ path: path.resolve(backendRoot, ".env"), override: true, quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16),
  COMPANY_NAME: z.string().default("CRM JD"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_INITIAL_PASSWORD: z.string().min(8),
  FRONTEND_URL: z.string().default("http://localhost:3000")
});

export const env = schema.parse(process.env);
