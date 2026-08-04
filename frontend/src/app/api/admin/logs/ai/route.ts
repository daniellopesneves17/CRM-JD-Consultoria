// Paginação de chamadas de IA e resumo mensal de tokens e custos.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const model = url.searchParams.get("model") || undefined;
    const promptType = url.searchParams.get("promptType") || undefined;
    const where = { ...(model ? { model } : {}), ...(promptType ? { promptType } : {}) };
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [items, total, summary] = await Promise.all([
      prisma.aiLog.findMany({ where, include: { lead: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.aiLog.count({ where }),
      prisma.aiLog.aggregate({ where: { createdAt: { gte: monthStart } }, _count: true, _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true } })
    ]);
    return NextResponse.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), summary: { calls: summary._count, tokens: (summary._sum.inputTokens ?? 0) + (summary._sum.outputTokens ?? 0), costUsd: Number(summary._sum.estimatedCostUsd ?? 0) } });
  } catch (error) { return apiError(error, "Não foi possível carregar os logs de IA."); }
}
