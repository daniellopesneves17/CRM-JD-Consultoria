// Autenticação JWT e guardas de papel para rotas privadas.
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

declare module "@fastify/jwt" {
  interface FastifyJWT { payload: { id: string; role: Role; email: string }; user: { id: string; role: Role; email: string } }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: import("fastify").FastifyRequest) => Promise<void>;
    requireAdmin: (request: import("fastify").FastifyRequest) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(jwt, { secret: env.JWT_SECRET });
  app.decorate("authenticate", async (request) => { await request.jwtVerify(); });
  app.decorate("requireAdmin", async (request) => {
    await request.jwtVerify();
    if (request.user.role !== Role.ADMIN || request.user.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) throw new AppError("Acesso exclusivo do administrador proprietário.", 403);
  });
});
