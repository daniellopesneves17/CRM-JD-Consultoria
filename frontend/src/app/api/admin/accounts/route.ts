// Administração de contas e leitura detalhada do desempenho por corretor.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { calculateGoalStatus } from "@/lib/workdays";

export async function GET() {
  const access = await requireAdmin(); if ("response" in access) return access.response;
  const now = new Date(); const [settings, accounts] = await Promise.all([
    prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }),
    prisma.user.findMany({ include: { goals: { where: { month: now.getMonth() + 1, year: now.getFullYear() }, take: 1 }, leads: { select: { stage: true, estimatedValue: true, proposals: { where: { status: "ACEITA" }, select: { monthlyValue: true } } } } }, orderBy: { createdAt: "asc" } })
  ]);
  return NextResponse.json({ settings, accounts: accounts.map(({ passwordHash: _passwordHash, goals, leads, ...account }) => {
    const goal = goals[0]; const target = goal ? Number(goal.targetValue) : 0; const current = goal ? Number(goal.currentValue) : leads.flatMap((lead) => lead.proposals).reduce((sum, item) => sum + Number(item.monthlyValue), 0);
    const status = target ? calculateGoalStatus({ targetValue: target, currentValue: current, month: now.getMonth() + 1, year: now.getFullYear() }) : null;
    const revenue = leads.flatMap((lead) => lead.proposals).reduce((sum, item) => sum + Number(item.monthlyValue), 0); const closed = leads.filter((lead) => lead.stage === "FECHADO").length; const qualified = leads.filter((lead) => lead.stage !== "NOVO" && lead.stage !== "PERDIDO").length;
    const insightStatus = !goal ? "NO_DATA" : status?.color === "green" ? "ON_TRACK" : status?.color === "red" ? "DIFFICULTY" : "BEHIND";
    const label = insightStatus === "ON_TRACK" ? "Batendo a meta" : insightStatus === "DIFFICULTY" ? "Com dificuldade" : insightStatus === "BEHIND" ? "Atenção ao ritmo" : "Sem meta";
    const message = !goal ? "Defina uma meta mensal para gerar a análise." : status?.onTrack ? `Projeção de ${Math.round(status.projectedEnd).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` : `Precisa de ${status?.dailyNeeded.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por dia útil para alcançar a meta.`;
    return { ...account, metrics: { leads: leads.length, qualified, closed, revenue, target, current, averageTicket: closed ? revenue / closed : 0 }, insight: { status: insightStatus, label, message } };
  }) });
}

export async function POST(request: Request) {
  const access = await requireAdmin(); if ("response" in access) return access.response;
  try { const body = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(8).max(128), target: z.number().nonnegative().default(0) }).parse(await request.json()); const passwordHash = await bcrypt.hash(body.password, 12); const now = new Date(); const user = await prisma.user.create({ data: { name: body.name, email: body.email, passwordHash, role: "CORRETOR", goals: body.target > 0 ? { create: { month: now.getMonth() + 1, year: now.getFullYear(), targetValue: body.target } } : undefined }, select: { id: true, name: true, email: true, role: true, active: true, crmEnabled: true, createdAt: true } }); return NextResponse.json(user, { status: 201 }); } catch (error) { return apiError(error, "Não foi possível criar a conta."); }
}
