// CRUD validado de leads e perfil individual.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../utils/errors.js";

const input = z.object({
  name: z.string().min(2).max(120), phone: z.string().regex(/^\d{10,15}$/), email: z.string().email().optional().nullable(),
  livesCount: z.number().int().min(1).max(30).default(1), notes: z.string().max(3000).optional().nullable(), userId: z.string().optional().nullable()
});
const routes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [app.authenticate] }, async () => app.prisma.lead.findMany({ take: 100, orderBy: { updatedAt: "desc" }, include: { assignedTo: { select: { id: true, name: true } } } }));
  app.post("/", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = input.parse(request.body);
    return reply.code(201).send(await app.prisma.lead.create({ data: body }));
  });
  app.get("/:id", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const lead = await app.prisma.lead.findUnique({ where: { id }, include: { assignedTo: true, conversations: { include: { messages: true } }, proposals: true, tasks: true, activities: true } });
    if (!lead) throw new AppError("Lead não encontrado.", 404);
    return lead;
  });
  app.patch("/:id", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return app.prisma.lead.update({ where: { id }, data: input.partial().parse(request.body) });
  });
  app.delete("/:id", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await app.prisma.lead.delete({ where: { id } });
    return reply.code(204).send();
  });
};
export default routes;

