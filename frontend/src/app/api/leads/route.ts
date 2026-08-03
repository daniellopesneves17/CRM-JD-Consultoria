// Lista e cria leads com escopo por corretor e validação Zod.
import { LeadSource, PipelineStage, Temperature } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { normalizePhone } from "@/services/uazapi";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().min(8).max(24).transform(normalizePhone),
  email: z.string().email().optional().or(z.literal("")),
  livesCount: z.coerce.number().int().min(1).max(100).default(1),
  stage: z.nativeEnum(PipelineStage).default(PipelineStage.NOVO),
  temperature: z.nativeEnum(Temperature).default(Temperature.FRIO),
  source: z.nativeEnum(LeadSource).default(LeadSource.WHATSAPP),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(4000).optional(),
  userId: z.string().cuid().optional()
});

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const where = {
    ...(access.session.user.role === "CORRETOR" ? { userId: access.session.user.id } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search } }] } : {})
  };
  const items = await prisma.lead.findMany({ where, include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } }, tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const data = createSchema.parse(await request.json());
    const userId = access.session.user.role === "ADMIN" ? data.userId ?? access.session.user.id : access.session.user.id;
    const lead = await prisma.lead.create({ data: { ...data, email: data.email || null, userId, lastActivityAt: new Date() } });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível cadastrar o lead.");
  }
}

