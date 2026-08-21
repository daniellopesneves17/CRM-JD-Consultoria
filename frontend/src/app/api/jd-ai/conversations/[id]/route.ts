import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const conversation = await prisma.jdAiConversation.findFirst({
    where: { id, userId: access.session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  return NextResponse.json(conversation);
}

export async function DELETE(_: Request, context: Context) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const deleted = await prisma.jdAiConversation.deleteMany({ where: { id, userId: access.session.user.id } });
  if (!deleted.count) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
