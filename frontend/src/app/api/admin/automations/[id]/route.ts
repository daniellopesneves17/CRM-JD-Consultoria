// Atualiza configuração, horários e intervalos de uma automação específica.
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

const schema = z.object({ active: z.boolean().optional(), delayHours: z.number().int().min(0).max(8760).optional(), config: z.record(z.string(), z.unknown()).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const data = { active: body.active, delayHours: body.delayHours, ...(body.config ? { config: body.config as Prisma.InputJsonValue } : {}) };
    return NextResponse.json(await prisma.automationRule.update({ where: { id }, data }));
  } catch (error) {
    return apiError(error, "Não foi possível salvar a configuração da automação.");
  }
}
