// Aniversariantes do mês entre clientes fechados.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const month = new Date().getMonth();
    const leads = await prisma.lead.findMany({ where: { stage: "FECHADO", birthDate: { not: null } }, include: { proposals: { where: { status: "ACEITA" }, orderBy: { acceptedAt: "desc" }, take: 1 } } });
    const items = leads.filter((lead) => lead.birthDate?.getMonth() === month).map((lead) => ({ id: lead.id, name: lead.name, phone: lead.phone, birthDate: lead.birthDate, operator: lead.currentOperator ?? lead.proposals[0]?.operator ?? "Não informada" })).sort((a, b) => (a.birthDate?.getDate() ?? 0) - (b.birthDate?.getDate() ?? 0));
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error, "Não foi possível carregar os aniversariantes.");
  }
}
