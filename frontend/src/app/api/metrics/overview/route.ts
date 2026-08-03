// KPIs consolidados por período e pelo escopo do usuário autenticado.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";
export async function GET(request: Request) {
  const access = await requireUser(); if ("response" in access) return access.response;
  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 30))); const since = new Date(Date.now() - days * 86_400_000);
  const leadScope = access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [leads, qualified, closed, accepted, conversationsToday, proposalsOpen] = await Promise.all([
    prisma.lead.count({ where: { ...leadScope, createdAt: { gte: since } } }),
    prisma.lead.count({ where: { ...leadScope, createdAt: { gte: since }, stage: { not: "NOVO" } } }),
    prisma.lead.findMany({ where: { ...leadScope, stage: "FECHADO", updatedAt: { gte: since } }, select: { livesCount: true, createdAt: true, updatedAt: true } }),
    prisma.proposal.findMany({ where: { status: "ACEITA", acceptedAt: { gte: since }, lead: leadScope }, select: { monthlyValue: true } }),
    prisma.conversation.count({ where: { updatedAt: { gte: today }, lead: leadScope } }),
    prisma.proposal.count({ where: { status: { in: ["RASCUNHO", "ENVIADA", "VISUALIZADA"] }, lead: leadScope } })
  ]);
  const revenue = accepted.reduce((sum, item) => sum + Number(item.monthlyValue), 0);
  return NextResponse.json({ leads, qualificationRate: leads ? (qualified / leads) * 100 : 0, closingRate: leads ? (closed.length / leads) * 100 : 0, averageTicket: accepted.length ? revenue / accepted.length : 0, revenue, activeLives: closed.reduce((sum, item) => sum + item.livesCount, 0), churnRate: 0, averageClosingDays: closed.length ? closed.reduce((sum, item) => sum + (item.updatedAt.getTime() - item.createdAt.getTime()) / 86_400_000, 0) / closed.length : 0, conversationsToday, proposalsOpen });
}
