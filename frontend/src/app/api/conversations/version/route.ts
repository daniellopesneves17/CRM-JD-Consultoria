import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() || null;
  if (access.session.user.role === "ADMIN" && !ownerId) return NextResponse.json({ version: "empty" });
  const userId = access.session.user.role === "ADMIN" ? ownerId! : access.session.user.id;
  const messageWhere = { conversation: { lead: { userId } } };
  const conversationWhere = { lead: { userId } };
  const [messageCount, latestMessage, conversationCount, latestConversation] = await prisma.$transaction([
    prisma.message.count({ where: messageWhere }),
    prisma.message.aggregate({ where: messageWhere, _max: { sentAt: true } }),
    prisma.conversation.count({ where: conversationWhere }),
    prisma.conversation.aggregate({ where: conversationWhere, _max: { updatedAt: true } }),
  ]);
  return NextResponse.json(
    { version: `${conversationCount}:${latestConversation._max.updatedAt?.getTime() ?? 0}:${messageCount}:${latestMessage._max.sentAt?.getTime() ?? 0}` },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
