// Consulta a meta atual e cria/atualiza metas mensais.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { calculateGoalStatus } from "@/lib/workdays";

export async function GET() {
  const access = await requireUser(); if ("response" in access) return access.response;
  const now = new Date(); const goal = await prisma.goal.findUnique({ where: { userId_month_year: { userId: access.session.user.id, month: now.getMonth() + 1, year: now.getFullYear() } } });
  if (!goal) return NextResponse.json({ error: "Meta do mês ainda não configurada." }, { status: 404 });
  return NextResponse.json({ ...goal, status: calculateGoalStatus({ targetValue: Number(goal.targetValue), currentValue: Number(goal.currentValue), month: goal.month, year: goal.year }) });
}

export async function POST(request: Request) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const body = z.object({ userId: z.string().cuid().optional(), month: z.number().int().min(1).max(12), year: z.number().int().min(2020).max(2100), targetValue: z.number().positive(), currentValue: z.number().nonnegative().optional() }).parse(await request.json());
    const userId = access.session.user.role === "ADMIN" && body.userId ? body.userId : access.session.user.id;
    const goal = await prisma.goal.upsert({ where: { userId_month_year: { userId, month: body.month, year: body.year } }, update: { targetValue: body.targetValue, ...(body.currentValue !== undefined ? { currentValue: body.currentValue } : {}) }, create: { userId, month: body.month, year: body.year, targetValue: body.targetValue, currentValue: body.currentValue ?? 0 } });
    return NextResponse.json(goal, { status: 201 });
  } catch (error) { return apiError(error, "Não foi possível salvar a meta."); }
}

