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
import { QueueService } from "./services/queue.service.js";
import { AppError } from "./utils/errors.js";
import { loggerOptions } from "./utils/logger.js";

export async function buildApp() {
  const app = Fastify({ logger: loggerOptions });
  await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  const queues = new QueueService(app.prisma);
  if (env.NODE_ENV !== "test") {
    queues.startWorkers();
  }
  app.addHook("onClose", async () => queues.close());
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

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: "Dados inválidos.", details: error.flatten() });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    request.log.error({ err: error }, "Erro ao processar requisição");
    return reply.code(statusCode).send({ error: statusCode === 500 ? "Erro interno do servidor." : error.message });
  });
  return app;
}

if (process.env.NODE_ENV !== "test") {
  buildApp()
    .then((app) => app.listen({ port: env.PORT, host: "0.0.0.0" }))
    .catch((error: unknown) => { console.error("Falha ao iniciar API:", error); process.exit(1); });
}
