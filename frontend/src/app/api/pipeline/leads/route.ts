// Consulta paginada e ordenável do pipeline, otimizada para a tabela comercial.
import { PipelineStage, Prisma, Temperature } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

const querySchema = z.object({
  temperature: z.nativeEnum(Temperature).optional(), userId: z.string().cuid().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(), maxDaysInactive: z.coerce.number().int().positive().optional(),
  orderBy: z.enum(["score", "lastActivityAt", "estimatedValue", "name", "createdAt"]).default("score"),
  order: z.enum(["asc", "desc"]).default("desc"), page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(120).optional()
});

export async function GET(request: Request) {
  const access = await requireUser(); if ("response" in access) return access.response;
  const url = new URL(request.url); const query = querySchema.parse(Object.fromEntries(url.searchParams));
  const stages = url.searchParams.getAll("stage").filter((value): value is PipelineStage => Object.values(PipelineStage).includes(value as PipelineStage));
  const where: Prisma.LeadWhereInput = {
    ...(access.session.user.role === "CORRETOR" ? { userId: access.session.user.id } : query.userId ? { userId: query.userId } : {}),
    ...(stages.length ? { stage: { in: stages } } : {}), ...(query.temperature ? { temperature: query.temperature } : {}),
    ...(query.minScore !== undefined ? { score: { gte: query.minScore } } : {}),
    ...(query.maxDaysInactive ? { lastActivityAt: { lt: new Date(Date.now() - query.maxDaysInactive * 86_400_000) } } : {}),
    ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { phone: { contains: query.search } }] } : {})
  };
  const [rows, total] = await Promise.all([
    prisma.lead.findMany({ where, include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } }, tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 1 }, conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { sentAt: "desc" }, take: 1 } } } }, orderBy: { [query.orderBy]: query.order }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.lead.count({ where })
  ]);
  const now = Date.now();
  const leads = rows.map(({ conversations, tasks, ...lead }) => ({ ...lead, daysSinceActivity: lead.lastActivityAt ? Math.floor((now - lead.lastActivityAt.getTime()) / 86_400_000) : null, nextTask: tasks[0] ?? null, lastMessagePreview: conversations[0]?.messages[0]?.content.slice(0, 80) ?? null, sentiment: conversations[0]?.sentiment ?? "NEUTRO" }));
  return NextResponse.json({ items: leads, leads, total, page: query.page, totalPages: Math.ceil(total / query.limit) });
}

