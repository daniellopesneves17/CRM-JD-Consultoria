// Lista conversas do inbox, alterna atendimento e fornece histórico.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const routes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [app.authenticate] }, async (request) => {
    const { status, search } = z.object({ status: z.enum(["BOT", "HUMANO", "ENCERRADO"]).optional(), search: z.string().optional() }).parse(request.query);
    return app.prisma.conversation.findMany({
      where: { status, lead: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : undefined },
      include: { lead: true, messages: { orderBy: { sentAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }
    });
  });
  app.get("/:id", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return app.prisma.conversation.findUnique({ where: { id }, include: { lead: true, messages: { orderBy: { sentAt: "asc" } } } });
  });
  app.patch("/:id/status", { preHandler: [app.authenticate] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { status } = z.object({ status: z.enum(["BOT", "HUMANO", "ENCERRADO"]) }).parse(request.body);
    return app.prisma.conversation.update({ where: { id }, data: { status } });
  });
};
export default routes;

