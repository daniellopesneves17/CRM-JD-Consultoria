// Criação de cotações, geração de PDF e atualização do status comercial.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { PdfService } from "../../services/pdf.service.js";
import { AppError } from "../../utils/errors.js";

const routes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [app.authenticate] }, async () => app.prisma.proposal.findMany({ include: { lead: true }, orderBy: { createdAt: "desc" } }));
  app.post("/", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z.object({ leadId: z.string(), operator: z.string().min(2), plan: z.string().min(1), coverage: z.string().min(1), monthlyValue: z.number().positive(), lives: z.array(z.object({ idade: z.number().int().min(0), valor: z.number().positive() })).min(1) }).parse(request.body);
    return reply.code(201).send(await app.prisma.proposal.create({ data: body }));
  });
  app.get("/:id/pdf", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const proposal = await app.prisma.proposal.findUnique({ where: { id }, include: { lead: true } });
    if (!proposal) throw new AppError("Proposta não encontrada.", 404);
    const lives = z.array(z.object({ idade: z.number(), valor: z.number() })).parse(proposal.lives);
    const pdf = await new PdfService().generate({ leadName: proposal.lead.name, operator: proposal.operator, plan: proposal.plan, coverage: proposal.coverage, monthlyValue: Number(proposal.monthlyValue), lives });
    return reply.type("application/pdf").header("Content-Disposition", `inline; filename=proposta-${id}.pdf`).send(pdf);
  });
};
export default routes;

