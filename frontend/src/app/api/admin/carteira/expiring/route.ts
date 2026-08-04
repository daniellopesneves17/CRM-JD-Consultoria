// Contratos encerrando em até 30, 60 ou 90 dias, calculados de dados reais.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const days = Math.min(90, Math.max(30, Number(new URL(request.url).searchParams.get("days") ?? 30)));
    const now = new Date();
    const limit = new Date(now.getTime() + days * 86_400_000);
    const leads = await prisma.lead.findMany({ where: { stage: "FECHADO" }, include: { proposals: { where: { status: "ACEITA" }, orderBy: { acceptedAt: "desc" }, take: 1 } }, orderBy: { contractEndDate: "asc" } });
    const items = leads.map((lead) => {
      const proposal = lead.proposals[0];
      const base = proposal?.acceptedAt ?? proposal?.createdAt;
      const expiresAt = lead.contractEndDate ?? (base ? new Date(base.getTime() + 365 * 86_400_000) : null);
      if (!expiresAt || expiresAt < now || expiresAt > limit) return null;
      return { id: lead.id, name: lead.name, phone: lead.phone, operator: lead.currentOperator ?? proposal?.operator ?? "Não informada", livesCount: lead.livesCount, monthlyValue: Number(lead.estimatedValue ?? proposal?.monthlyValue ?? 0), expiresAt, daysRemaining: Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000) };
    }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.daysRemaining - b.daysRemaining);
    return NextResponse.json({ days, items });
  } catch (error) {
    return apiError(error, "Não foi possível carregar os vencimentos.");
  }
}
