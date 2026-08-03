// Consulta operacional do funil, movimentação, detalhe e ações em massa.
import { FastifyPluginAsync } from "fastify";
import { Prisma, PipelineStage, Temperature } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../utils/errors.js";

const querySchema = z.object({
  stage: z.nativeEnum(PipelineStage).optional(), temperature: z.nativeEnum(Temperature).optional(), userId: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(), maxDaysInactive: z.coerce.number().positive().optional(),
  orderBy: z.enum(["score", "lastActivityAt", "estimatedValue", "name"]).default("score"), order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(25)
});
const routes: FastifyPluginAsync = async (app) => {
  app.get("/leads", { preHandler: [app.authenticate] }, async (request) => {
    const q = querySchema.parse(request.query);
    const where: Prisma.LeadWhereInput = {
      stage: q.stage, temperature: q.temperature, userId: q.userId, score: q.minScore === undefined ? undefined : { gte: q.minScore },
      lastActivityAt: q.maxDaysInactive ? { lt: new Date(Date.now() - q.maxDaysInactive * 86_400_000) } : undefined
    };
    const [items, total] = await app.prisma.$transaction([
      app.prisma.lead.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { [q.orderBy]: q.order }, include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } }, tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 1 } } }),
      app.prisma.lead.count({ where })
    ]);
    return { items, total, page: q.page, pages: Math.ceil(total / q.limit) };
  });
  app.patch("/leads/:id/stage", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { stage } = z.object({ stage: z.nativeEnum(PipelineStage) }).parse(request.body);
    return app.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({ where: { id }, data: { stage, lastActivityAt: new Date() } });
      await tx.activity.create({ data: { leadId: id, type: "stage_changed", detail: `Etapa alterada para ${stage}` } });
      return lead;
    });
  });
  app.get("/leads/:id/detail", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const lead = await app.prisma.lead.findUnique({ where: { id }, include: { assignedTo: true, conversations: { include: { messages: { orderBy: { sentAt: "asc" } } } }, proposals: true, tasks: true, activities: { orderBy: { createdAt: "desc" } } } });
    if (!lead) throw new AppError("Lead não encontrado.", 404);
    return lead;
  });
  app.post("/bulk-action", { preHandler: [app.authenticate] }, async (request) => {
    const body = z.discriminatedUnion("action", [
      z.object({ action: z.literal("stage"), leadIds: z.array(z.string()).min(1), stage: z.nativeEnum(PipelineStage) }),
      z.object({ action: z.literal("assign"), leadIds: z.array(z.string()).min(1), userId: z.string() })
    ]).parse(request.body);
    const data = body.action === "stage" ? { stage: body.stage } : { userId: body.userId };
    const result = await app.prisma.lead.updateMany({ where: { id: { in: body.leadIds } }, data });
    return { updated: result.count };
  });
};
export default routes;

