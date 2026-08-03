// Inbox de conversas com mensagens recentes e escopo do corretor.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

export async function GET() {
  const access = await requireUser(); if ("response" in access) return access.response;
  const items = await prisma.conversation.findMany({
    where: access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } },
    include: { lead: { include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } } }, messages: { orderBy: { sentAt: "asc" }, take: 100 } },
    orderBy: { updatedAt: "desc" }, take: 100
  });
  return NextResponse.json(items);
}

