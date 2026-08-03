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

type AccountAccess = { active: boolean; crmEnabled: boolean; role: Role };
type CrmAvailability = { crmEnabled: boolean; maintenanceMessage: string };

export function assertAccountAccess(user: AccountAccess | null, settings?: CrmAvailability): asserts user is AccountAccess {
  if (!user || !user.active) throw new AppError("Sessão inválida ou conta desativada.", 401);
  if (user.role !== Role.ADMIN && settings && (!user.crmEnabled || !settings.crmEnabled)) {
    throw new AppError(settings.maintenanceMessage, 403);
  }
}

export default fp(async (app) => {
  await app.register(jwt, { secret: env.JWT_SECRET });
  app.decorate("authenticate", async (request) => {
    await request.jwtVerify();

    const user = await app.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { active: true, crmEnabled: true, role: true, email: true }
    });

    assertAccountAccess(user);
    if (user.role !== request.user.role || user.email.toLowerCase() !== request.user.email.toLowerCase()) {
      throw new AppError("Sessão desatualizada. Entre novamente.", 401);
    }

    if (user.role !== Role.ADMIN) {
      const settings = await app.prisma.systemSettings.upsert({
        where: { id: "global" },
        update: {},
        create: { id: "global" }
      });
      assertAccountAccess(user, settings);
    }
  });
  app.decorate("requireAdmin", async (request) => {
    await app.authenticate(request);
    if (request.user.role !== Role.ADMIN || request.user.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) throw new AppError("Acesso exclusivo do administrador proprietário.", 403);
  });
});
