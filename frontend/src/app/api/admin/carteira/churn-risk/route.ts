// Identifica risco de churn por inatividade, frustração e propostas recusadas.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const threshold = new Date(Date.now() - 60 * 86_400_000);
    const leads = await prisma.lead.findMany({ where: { stage: "FECHADO" }, include: { proposals: { select: { status: true } }, conversations: { orderBy: { updatedAt: "desc" }, take: 3, select: { sentiment: true, updatedAt: true } } }, orderBy: { lastActivityAt: "asc" } });
    const items = leads.map((lead) => {
      const reasons: string[] = [];
      if (!lead.lastActivityAt || lead.lastActivityAt < threshold) reasons.push("Sem atividade há mais de 60 dias");
      if (lead.conversations.length >= 1 && lead.conversations.filter((item) => item.sentiment === "FRUSTRADO").length >= Math.min(2, lead.conversations.length)) reasons.push("Sentimento frustrado nas conversas recentes");
      if (lead.proposals.filter((proposal) => proposal.status === "RECUSADA").length > 2) reasons.push("Mais de duas propostas recusadas");
      return reasons.length ? { id: lead.id, name: lead.name, phone: lead.phone, reasons, lastContact: lead.lastActivityAt ?? lead.conversations[0]?.updatedAt ?? lead.updatedAt, score: lead.score } : null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error, "Não foi possível analisar o risco da carteira.");
  }
}
