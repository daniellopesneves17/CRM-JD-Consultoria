// Receita mensal das propostas aceitas nos últimos doze meses.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";
export async function GET() {
  const access = await requireUser(); if ("response" in access) return access.response;
  const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1); since.setHours(0, 0, 0, 0);
  const rows = await prisma.proposal.findMany({ where: { status: "ACEITA", acceptedAt: { gte: since }, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) }, select: { monthlyValue: true, acceptedAt: true } });
  const months = new Map<string, number>(); for (const row of rows) { const date = row.acceptedAt ?? new Date(); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; months.set(key, (months.get(key) ?? 0) + Number(row.monthlyValue)); }
  return NextResponse.json([...months].map(([month, revenue]) => ({ month, revenue })).sort((a, b) => a.month.localeCompare(b.month)));
}
