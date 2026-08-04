// Cadastro e listagem de operadoras disponíveis no CRM.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

const schema = z.object({ name: z.string().trim().min(2).max(100), logoUrl: z.string().url().nullable().optional(), commercialContact: z.string().trim().max(160).nullable().optional(), notes: z.string().trim().max(500).nullable().optional() });

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  return NextResponse.json({ operators: await prisma.operator.findMany({ orderBy: { name: "asc" } }) });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try { return NextResponse.json(await prisma.operator.create({ data: schema.parse(await request.json()) }), { status: 201 }); }
  catch (error) { return apiError(error, "Não foi possível cadastrar a operadora."); }
}
