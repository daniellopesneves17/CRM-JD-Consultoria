// Distribuição atual dos leads pelas etapas do funil.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";
export async function GET() {
  const access = await requireUser(); if ("response" in access) return access.response;
  const data = await prisma.lead.groupBy({ by: ["stage"], where: access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }, _count: { _all: true } });
  return NextResponse.json(data.map((item) => ({ stage: item.stage, total: item._count._all })));
}

