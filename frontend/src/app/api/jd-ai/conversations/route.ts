import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const [items, briefing] = await Promise.all([
    prisma.jdAiConversation.findMany({
      where: { userId: access.session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.jdAiBriefing.findFirst({ orderBy: { researchDate: "desc" }, select: { researchDate: true, title: true, createdAt: true } }),
  ]);
  return NextResponse.json({ items, briefing });
}

export async function POST() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const conversation = await prisma.jdAiConversation.create({ data: { userId: access.session.user.id } });
  return NextResponse.json(conversation, { status: 201 });
}
