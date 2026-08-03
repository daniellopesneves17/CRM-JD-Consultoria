// Lista e cria propostas comerciais validadas.
import { ProposalStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
const schema = z.object({ leadId: z.string().cuid(), operator: z.string().trim().min(2).max(120), plan: z.string().trim().min(2).max(120), coverage: z.string().trim().min(2).max(500), monthlyValue: z.number().positive(), lives: z.array(z.object({ name: z.string().min(2), age: z.number().int().min(0).max(120).optional(), value: z.number().nonnegative().optional() })).min(1), status: z.nativeEnum(ProposalStatus).optional() });
export async function GET() {
  const access = await requireUser(); if ("response" in access) return access.response;
  return NextResponse.json(await prisma.proposal.findMany({ where: access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }, include: { lead: { select: { id: true, name: true, phone: true, livesCount: true } } }, orderBy: { createdAt: "desc" } }));
}
export async function POST(request: Request) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try { const body = schema.parse(await request.json()); const lead = await prisma.lead.findFirst({ where: { id: body.leadId, ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }) } }); if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 }); return NextResponse.json(await prisma.proposal.create({ data: body }), { status: 201 }); } catch (error) { return apiError(error, "Não foi possível criar a proposta."); }
}

