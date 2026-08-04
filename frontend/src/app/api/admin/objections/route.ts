// Biblioteca editável de objeções e respostas da persona de IA.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

const schema = z.object({ id: z.string().optional(), objection: z.string().trim().min(2).max(200), response: z.string().trim().min(2).max(1000), active: z.boolean().optional() });

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try { const body = schema.parse(await request.json()); return NextResponse.json(await prisma.objectionLibrary.create({ data: { objection: body.objection, response: body.response, active: body.active ?? true } }), { status: 201 }); }
  catch (error) { return apiError(error, "Não foi possível adicionar a objeção."); }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try { const body = schema.extend({ id: z.string().min(1) }).parse(await request.json()); return NextResponse.json(await prisma.objectionLibrary.update({ where: { id: body.id }, data: { objection: body.objection, response: body.response, active: body.active } })); }
  catch (error) { return apiError(error, "Não foi possível atualizar a objeção."); }
}
