// Desempenho por corretor, metas e ranking mensal calculados a partir do banco real.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthBounds, percentage, variation } from "@/lib/admin-data";
import { apiError, requireAdmin } from "@/lib/route";

const qualified = ["QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE", "NEGOCIACAO", "FECHADO"] as const;

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const now = new Date();
    const { start, end, previousStart } = monthBounds(now);
    const users = await prisma.user.findMany({
      where: { role: "CORRETOR" },
      orderBy: { name: "asc" },
      include: {
        goals: { where: { month: now.getMonth() + 1, year: now.getFullYear() }, take: 1 },
        leads: { include: { conversations: { where: { createdAt: { gte: previousStart } }, include: { messages: { orderBy: { sentAt: "asc" }, select: { sender: true, sentAt: true } } } } } }
      }
    });
    const rows = users.map((user) => {
      const currentClosed = user.leads.filter((lead) => lead.stage === "FECHADO" && lead.updatedAt >= start && lead.updatedAt < end);
      const previousClosed = user.leads.filter((lead) => lead.stage === "FECHADO" && lead.updatedAt >= previousStart && lead.updatedAt < start);
      const revenue = currentClosed.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0);
      const previousRevenue = previousClosed.reduce((sum, lead) => sum + Number(lead.estimatedValue ?? 0), 0);
      const responseMinutes = user.leads.flatMap((lead) => lead.conversations).map((conversation) => {
        const firstLead = conversation.messages.find((message) => message.sender === "LEAD");
        const firstReply = firstLead && conversation.messages.find((message) => message.sender !== "LEAD" && message.sentAt > firstLead.sentAt);
        return firstLead && firstReply ? Math.max(0, (firstReply.sentAt.getTime() - firstLead.sentAt.getTime()) / 60_000) : null;
      }).filter((value): value is number => value !== null);
      const goal = user.goals[0];
      const target = Number(goal?.targetValue ?? 0);
      const current = Number(goal?.currentValue ?? revenue);
      const goalPercentage = percentage(current, target);
      return {
        id: user.id, name: user.name, avatarUrl: user.avatarUrl, active: user.active && user.crmEnabled,
        activeLeads: user.leads.filter((lead) => !["FECHADO", "PERDIDO"].includes(lead.stage)).length,
        closedThisMonth: currentClosed.length,
        revenueThisMonth: revenue,
        previousRevenue,
        revenueVariation: variation(revenue, previousRevenue),
        goal: goal ? { target, current, color: goalPercentage >= 100 ? "green" : goalPercentage >= 70 ? "yellow" : "red", percentage: goalPercentage } : null,
        avgResponseTime: responseMinutes.length ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length) : 0,
        conversionRate: percentage(currentClosed.length, user.leads.filter((lead) => lead.createdAt >= start && qualified.includes(lead.stage as typeof qualified[number])).length)
      };
    });
    const ranking = [...rows].sort((a, b) => b.revenueThisMonth - a.revenueThisMonth).slice(0, 3);
    return NextResponse.json({ users: rows, ranking });
  } catch (error) {
    return apiError(error, "Não foi possível carregar o desempenho da equipe.");
  }
}
