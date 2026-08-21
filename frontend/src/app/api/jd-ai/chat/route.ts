import { JdAiMessageRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { makeConversationTitle } from "@/lib/jd-ai";
import { allowRequest } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { answerJdAi } from "@/services/ai/jd-ai";

export const maxDuration = 120;

const bodySchema = z.object({
  conversationId: z.string().cuid().optional(),
  message: z.string().trim().min(2).max(4000),
});

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  if (!(await allowRequest(`jd-ai:${access.session.user.id}`, 15))) {
    return NextResponse.json({ error: "Muitas mensagens em pouco tempo. Aguarde um instante." }, { status: 429 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const existing = body.conversationId
      ? await prisma.jdAiConversation.findFirst({ where: { id: body.conversationId, userId: access.session.user.id } })
      : null;
    if (body.conversationId && !existing) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });

    const conversation = existing ?? await prisma.jdAiConversation.create({ data: { userId: access.session.user.id } });
    const [history, briefing] = await Promise.all([
      prisma.jdAiMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 16,
        select: { role: true, content: true },
      }),
      prisma.jdAiBriefing.findFirst({ orderBy: { researchDate: "desc" }, select: { content: true } }),
    ]);

    const userMessage = await prisma.jdAiMessage.create({
      data: { conversationId: conversation.id, role: JdAiMessageRole.USER, content: body.message },
    });
    let answer: Awaited<ReturnType<typeof answerJdAi>>;
    try {
      answer = await answerJdAi({ history: history.reverse(), question: body.message, briefing: briefing?.content });
    } catch (error) {
      await prisma.jdAiMessage.delete({ where: { id: userMessage.id } }).catch(() => undefined);
      if (!existing) await prisma.jdAiConversation.delete({ where: { id: conversation.id } }).catch(() => undefined);
      throw error;
    }
    const assistantMessage = await prisma.jdAiMessage.create({
      data: { conversationId: conversation.id, role: JdAiMessageRole.ASSISTANT, content: answer.content, sources: answer.sources },
    });
    const title = history.length === 0 ? makeConversationTitle(body.message) : conversation.title;
    await prisma.jdAiConversation.update({ where: { id: conversation.id }, data: { title } });

    return NextResponse.json({ conversation: { id: conversation.id, title }, userMessage, assistantMessage });
  } catch (error) {
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "A JD AI ainda não está conectada à OpenAI. Configure OPENAI_API_KEY." }, { status: 503 });
    }
    return apiError(error, "A JD AI não conseguiu responder agora.");
  }
}
