// Inbox de conversas com mensagens recentes e escopo do corretor.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const params = new URL(request.url).searchParams;
  const ownerId = params.get("ownerId")?.trim() || null;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(20, Number.parseInt(params.get("limit") ?? "100", 10) || 100));
  const query = params.get("q")?.trim().slice(0, 100) ?? "";
  const priority = params.get("priority") === "urgent" ? "urgent" : params.get("priority") === "normal" ? "normal" : "all";
  if (access.session.user.role === "ADMIN" && !ownerId) return NextResponse.json({ items: [], total: 0, page: 1, pages: 0 });
  const userId = access.session.user.role === "ADMIN" ? ownerId! : access.session.user.id;
  const where = {
    lead: {
      userId,
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query.replace(/\D/g, "") || query } }] } : {}),
    },
    ...(priority === "urgent"
      ? { OR: [{ isUrgent: true }, { sentiment: "URGENTE" as const }] }
      : priority === "normal"
        ? { isUrgent: false, sentiment: { not: "URGENTE" as const } }
        : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
    where,
    include: { lead: { include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } } }, messages: { where: { content: { notIn: ["[chamada]"] } }, orderBy: { sentAt: "desc" }, take: 100 } },
    orderBy: [{ isUrgent: "desc" }, { updatedAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  }),
  ]);
  return NextResponse.json({
    items: items.map((item) => ({ ...item, messages: item.messages.reverse() })),
    total,
    page,
    pages: Math.ceil(total / limit),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

