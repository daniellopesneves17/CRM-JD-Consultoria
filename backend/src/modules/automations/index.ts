// CRUD de regras de automação e disparo manual controlado.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const rule = z.object({ name: z.string().min(3), trigger: z.string().min(3), delayHours: z.number().int().min(0), template: z.string().min(3), active: z.boolean().default(true) });
const routes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [app.authenticate] }, async () => app.prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } }));
  app.post("/", { preHandler: [app.requireAdmin] }, async (request, reply) => reply.code(201).send(await app.prisma.automationRule.create({ data: rule.parse(request.body) })));
  app.patch("/:id", { preHandler: [app.requireAdmin] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return app.prisma.automationRule.update({ where: { id }, data: rule.partial().parse(request.body) });
  });
};
export default routes;

