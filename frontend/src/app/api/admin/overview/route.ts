// KPIs executivos reais, comparados com o mês anterior e restritos a ADMIN.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthBounds, percentage, variation } from "@/lib/admin-data";
import { apiError, requireAdmin } from "@/lib/route";

const qualifiedStages = ["QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE", "NEGOCIACAO", "FECHADO"] as const;

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { start, end, previousStart } = monthBounds();
    const [activeClosed, currentClosed, previousClosed, currentLeads, previousLeads, currentQualified, previousQualified] = await Promise.all([
      prisma.lead.aggregate({ where: { stage: "FECHADO" }, _sum: { estimatedValue: true, livesCount: true } }),
      prisma.lead.aggregate({ where: { stage: "FECHADO", updatedAt: { gte: start, lt: end } }, _sum: { estimatedValue: true, livesCount: true }, _count: true }),
      prisma.lead.aggregate({ where: { stage: "FECHADO", updatedAt: { gte: previousStart, lt: start } }, _sum: { estimatedValue: true, livesCount: true }, _count: true }),
      prisma.lead.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.lead.count({ where: { createdAt: { gte: previousStart, lt: start } } }),
      prisma.lead.count({ where: { createdAt: { gte: start, lt: end }, stage: { in: [...qualifiedStages] } } }),
      prisma.lead.count({ where: { createdAt: { gte: previousStart, lt: start }, stage: { in: [...qualifiedStages] } } })
    ]);
    const mrr = Number(activeClosed._sum.estimatedValue ?? 0);
    const currentRevenue = Number(currentClosed._sum.estimatedValue ?? 0);
    const previousRevenue = Number(previousClosed._sum.estimatedValue ?? 0);
    const currentConversion = percentage(currentClosed._count, currentQualified);
    const previousConversion = percentage(previousClosed._count, previousQualified);
    return NextResponse.json({
      mrr: { value: mrr, variation: variation(currentRevenue, previousRevenue) },
      activeLives: { value: activeClosed._sum.livesCount ?? 0, variation: variation(currentClosed._sum.livesCount ?? 0, previousClosed._sum.livesCount ?? 0) },
      leadsThisMonth: { value: currentLeads, variation: variation(currentLeads, previousLeads) },
      conversionRate: { value: currentConversion, variation: Math.round((currentConversion - previousConversion) * 100) / 100 }
    });
  } catch (error) {
    return apiError(error, "Não foi possível calcular os indicadores executivos.");
  }
}
