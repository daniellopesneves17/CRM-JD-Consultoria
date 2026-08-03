// Registro local de mensagens do corretor.
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../utils/errors.js";

const routes: FastifyPluginAsync = async (app) => {
  app.post("/", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z.object({ conversationId: z.string(), content: z.string().min(1).max(4000) }).parse(request.body);
    const conversation = await app.prisma.conversation.findUnique({ where: { id: body.conversationId }, include: { lead: true } });
    if (!conversation) throw new AppError("Conversa não encontrada.", 404);
    const message = await app.prisma.message.create({ data: { ...body, sender: "CORRETOR", userId: request.user.id } });
    return reply.code(201).send(message);
  });
};
export default routes;
