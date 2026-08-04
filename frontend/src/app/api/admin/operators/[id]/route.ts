// Edição e ativação de uma operadora cadastrada.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

const schema = z.object({ name: z.string().trim().min(2).max(100).optional(), logoUrl: z.string().url().nullable().optional(), commercialContact: z.string().trim().max(160).nullable().optional(), notes: z.string().trim().max(500).nullable().optional(), active: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try { const { id } = await params; return NextResponse.json(await prisma.operator.update({ where: { id }, data: schema.parse(await request.json()) })); }
  catch (error) { return apiError(error, "Não foi possível atualizar a operadora."); }
}
