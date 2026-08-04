// Lista automações e permite alterações rápidas de estado pelo administrador.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const items = await prisma.automationRule.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ automations: items.map((item) => ({ ...item, conversionRate: item.sentCount ? Math.round(item.convertedCount / item.sentCount * 10_000) / 100 : 0 })) });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const body = z.object({ id: z.string().min(1), active: z.boolean() }).parse(await request.json());
    return NextResponse.json(await prisma.automationRule.update({ where: { id: body.id }, data: { active: body.active } }));
  } catch (error) {
    return apiError(error, "Não foi possível atualizar a automação.");
  }
}
