// Inicializa Fastify, plugins, módulos, filas, segurança e tratamento global de erros.
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./modules/auth/index.js";
import leadsRoutes from "./modules/leads/index.js";
import conversationRoutes from "./modules/conversations/index.js";
import messageRoutes from "./modules/messages/index.js";
import pipelineRoutes from "./modules/pipeline/index.js";
import proposalRoutes from "./modules/proposals/index.js";
import automationRoutes from "./modules/automations/index.js";
import goalRoutes from "./modules/goals/index.js";
import metricRoutes from "./modules/metrics/index.js";
import adminRoutes from "./modules/admin/index.js";
import systemRoutes from "./modules/system/index.js";
import { QueueService } from "./services/queue.service.js";
import { AppError } from "./utils/errors.js";
import { loggerOptions } from "./utils/logger.js";
import { rewriteServiceUrl } from "./utils/service-url.js";

export async function buildApp() {
  const app = Fastify({ logger: loggerOptions, rewriteUrl: rewriteServiceUrl });
  const allowedOrigins = new Set(env.FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean));
  for (const vercelHost of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (vercelHost) allowedOrigins.add(`https://${vercelHost}`);
  }
  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      const isAllowedPreview = env.ALLOW_VERCEL_PREVIEWS && origin?.startsWith("https://") && origin.endsWith(".vercel.app");
      callback(null, !origin || allowedOrigins.has(origin) || Boolean(isAllowedPreview));
    }
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(prismaPlugin);
  if (env.REDIS_URL) await app.register(redisPlugin);
  await app.register(authPlugin);

  const queues = env.REDIS_URL && env.ENABLE_QUEUE_WORKERS && !env.VERCEL
    ? new QueueService(app.prisma, env.REDIS_URL)
    : null;
  if (queues && env.NODE_ENV !== "test") {
    queues.startWorkers();
    app.addHook("onClose", async () => queues.close());
  }
  app.get("/health", async () => ({ status: "ok", service: "crm-saude-api" }));
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(leadsRoutes, { prefix: "/leads" });
  await app.register(conversationRoutes, { prefix: "/conversations" });
  await app.register(messageRoutes, { prefix: "/messages" });
  await app.register(pipelineRoutes, { prefix: "/pipeline" });
  await app.register(proposalRoutes, { prefix: "/proposals" });
  await app.register(automationRoutes, { prefix: "/automations" });
  await app.register(goalRoutes, { prefix: "/goals" });
  await app.register(metricRoutes, { prefix: "/metrics" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(systemRoutes, { prefix: "/system" });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: "Dados inválidos.", details: error.flatten() });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    request.log.error({ err: error }, "Erro ao processar requisição");
    const message = error instanceof Error ? error.message : "Erro interno do servidor.";
    return reply.code(statusCode).send({ error: statusCode === 500 ? "Erro interno do servidor." : message });
  });
  return app;
}

const app = await buildApp();

// A Vercel precisa de um servidor exportado durante a avaliação do módulo.
// Localmente, o Fastify continua abrindo a porta para o modo watch e o Docker.
export default app.server;

if (process.env.NODE_ENV !== "test" && !env.VERCEL) {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}
