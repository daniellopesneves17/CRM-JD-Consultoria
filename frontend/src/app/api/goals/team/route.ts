// Semáforo de metas da equipe, exclusivo do administrador.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/route";
import { calculateGoalStatus } from "@/lib/workdays";
export async function GET() {
  const access = await requireAdmin(); if ("response" in access) return access.response;
  const now = new Date(); const goals = await prisma.goal.findMany({ where: { month: now.getMonth() + 1, year: now.getFullYear() }, include: { user: { select: { id: true, name: true, avatarUrl: true, active: true } } } });
  return NextResponse.json(goals.map((goal) => ({ ...goal, status: calculateGoalStatus({ targetValue: Number(goal.targetValue), currentValue: Number(goal.currentValue), month: goal.month, year: goal.year }) })));
}

