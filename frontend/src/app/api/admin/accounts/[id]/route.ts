// Atualiza acesso, senha e meta, ou remove um corretor sem expor credenciais.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAdmin(); if ("response" in access) return access.response;
  try { const { id } = await params; const body = z.object({ active: z.boolean().optional(), crmEnabled: z.boolean().optional(), target: z.number().nonnegative().optional(), password: z.string().min(8).max(128).optional() }).parse(await request.json()); const now = new Date(); const data = { active: body.active, crmEnabled: body.crmEnabled, ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 12) } : {}) }; const user = await prisma.$transaction(async (tx) => { const updated = await tx.user.update({ where: { id }, data }); if (body.target !== undefined) await tx.goal.upsert({ where: { userId_month_year: { userId: id, month: now.getMonth() + 1, year: now.getFullYear() } }, update: { targetValue: body.target }, create: { userId: id, month: now.getMonth() + 1, year: now.getFullYear(), targetValue: body.target } }); return updated; }); return NextResponse.json({ id: user.id, active: user.active, crmEnabled: user.crmEnabled }); } catch (error) { return apiError(error, "Não foi possível atualizar a conta."); }
}
export async function DELETE(_: Request, { params }: Context) {
  const access = await requireAdmin(); if ("response" in access) return access.response; const { id } = await params; if (id === access.session.user.id) return NextResponse.json({ error: "A conta administradora em uso não pode ser excluída." }, { status: 400 }); const target = await prisma.user.findUnique({ where: { id }, select: { role: true } }); if (!target || target.role === "ADMIN") return NextResponse.json({ error: "Conta de corretor não encontrada." }, { status: 404 }); await prisma.user.delete({ where: { id } }); return new NextResponse(null, { status: 204 });
}
