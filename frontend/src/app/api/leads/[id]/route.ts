// Perfil 360º e manutenção de um lead autorizado.
import { LeadSource, PipelineStage, Temperature } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(), email: z.string().email().nullable().optional(),
  livesCount: z.number().int().min(1).max(100).optional(), stage: z.nativeEnum(PipelineStage).optional(),
  temperature: z.nativeEnum(Temperature).optional(), source: z.nativeEnum(LeadSource).optional(),
  estimatedValue: z.number().nonnegative().nullable().optional(), notes: z.string().max(4000).nullable().optional(),
  lostReason: z.string().max(1000).nullable().optional(), cancelReason: z.string().max(1000).nullable().optional(),
  userId: z.string().cuid().nullable().optional()
});

async function scopedLead(id: string, userId: string, isAdmin: boolean) {
  return prisma.lead.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }) }, include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } }, conversations: { include: { messages: { orderBy: { sentAt: "asc" } } }, orderBy: { updatedAt: "desc" } }, proposals: { orderBy: { createdAt: "desc" } }, tasks: { orderBy: { dueAt: "asc" } }, activities: { orderBy: { createdAt: "desc" }, take: 100 } } });
  return lead ? NextResponse.json(lead) : NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const { id } = await params;
    if (!(await scopedLead(id, access.session.user.id, access.session.user.role === "ADMIN"))) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    const data = updateSchema.parse(await request.json());
    const safeData = access.session.user.role === "ADMIN" ? data : { ...data, userId: undefined };
    const lead = await prisma.lead.update({ where: { id }, data: { ...safeData, lastActivityAt: new Date() } });
    return NextResponse.json(lead);
  } catch (error) { return apiError(error, "Não foi possível atualizar o lead."); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  const { id } = await params;
  if (!(await scopedLead(id, access.session.user.id, access.session.user.role === "ADMIN"))) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  await prisma.lead.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

