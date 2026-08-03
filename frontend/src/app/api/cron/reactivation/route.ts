// Agenda reativações ao longo das próximas três horas, evitando rajadas artificiais.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron } from "@/lib/cron";
export async function GET(request: Request) {
  const denied = authorizeCron(request); if (denied) return denied; const threshold = new Date(Date.now() - 30 * 86_400_000);
  const leads = await prisma.lead.findMany({ where: { stage: { in: ["QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE"] }, lastActivityAt: { lt: threshold }, tasks: { none: { type: "REATIVACAO", done: false } }, activities: { none: { type: "reactivation_sent", createdAt: { gte: threshold } } } }, take: 15 });
  await prisma.task.createMany({ data: leads.map((lead) => ({ leadId: lead.id, title: "Reativação automática", description: "Mensagem personalizada pela IA", type: "REATIVACAO" as const, dueAt: new Date(Date.now() + Math.floor(Math.random() * 180) * 60_000) })) });
  return NextResponse.json({ ok: true, scheduled: leads.length });
}

