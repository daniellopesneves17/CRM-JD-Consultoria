// Compartilha Redis com filas e rotas, encerrando a conexão com o servidor.
import fp from "fastify-plugin";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance { redis: Redis }
}

export default fp(async (app) => {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  app.decorate("redis", redis);
  app.addHook("onClose", async () => redis.quit());
});
