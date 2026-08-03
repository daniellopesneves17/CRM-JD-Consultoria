// Login, renovação de JWT e bloqueios de disponibilidade por conta e globais.
import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../utils/errors.js";

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(request.body);
    const user = await app.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.active || !(await bcrypt.compare(body.password, user.passwordHash))) throw new AppError("E-mail ou senha inválidos.", 401);
    const settings = await app.prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
    if (user.role !== Role.ADMIN && (!user.crmEnabled || !settings.crmEnabled)) throw new AppError(settings.maintenanceMessage, 403);
    await app.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const payload = { id: user.id, role: user.role, email: user.email };
    const token = app.jwt.sign(payload, { expiresIn: "8h" });
    const refreshToken = app.jwt.sign(payload, { expiresIn: "30d" });
    return { token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });
  app.post("/refresh", async (request) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
    const payload = app.jwt.verify<{ id: string; role: Role; email: string }>(refreshToken);
    return { token: app.jwt.sign({ id: payload.id, role: payload.role, email: payload.email }, { expiresIn: "8h" }) };
  });
  app.post("/logout", { preHandler: [app.authenticate] }, async () => ({ success: true }));
};
export default authRoutes;
