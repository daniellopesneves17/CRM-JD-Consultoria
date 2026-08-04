// Configurações gerais da corretora, persona e disponibilidade do CRM.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

const companySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(), cnpj: z.string().trim().max(24).nullable().optional(), susep: z.string().trim().max(40).nullable().optional(), address: z.string().trim().max(300).nullable().optional(), phone: z.string().trim().max(30).nullable().optional(), email: z.string().email().nullable().optional(), website: z.string().url().nullable().optional(), logoUrl: z.string().url().nullable().optional(), personaName: z.string().trim().min(2).max(40).optional(), personaTone: z.enum(["formal", "friendly", "casual"]).optional(), botStartHour: z.number().int().min(0).max(23).optional(), botEndHour: z.number().int().min(0).max(23).optional(), welcomeMessage: z.string().trim().max(300).nullable().optional(), offHoursMessage: z.string().trim().max(200).nullable().optional()
});
const systemSchema = z.object({ crmEnabled: z.boolean().optional(), updatePolicy: z.enum(["AUTOMATIC", "ON_COMPLETION"]).optional(), maintenanceMessage: z.string().trim().min(3).max(240).optional() });
const patchSchema = z.object({ company: companySchema.optional(), system: systemSchema.optional() });

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const [company, system, operators, objections] = await Promise.all([
    prisma.companySettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
    prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }),
    prisma.operator.findMany({ orderBy: { name: "asc" } }),
    prisma.objectionLibrary.findMany({ orderBy: { createdAt: "asc" } })
  ]);
  return NextResponse.json({ company, system, operators, objections });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const parsed = patchSchema.parse(await request.json());
    const [company, system] = await prisma.$transaction([
      prisma.companySettings.upsert({ where: { id: "default" }, update: parsed.company ?? {}, create: { id: "default", ...(parsed.company ?? {}) } }),
      prisma.systemSettings.upsert({ where: { id: "global" }, update: parsed.system ?? {}, create: { id: "global", ...(parsed.system ?? {}) } })
    ]);
    return NextResponse.json({ company, system });
  } catch (error) {
    return apiError(error, "Não foi possível salvar as configurações.");
  }
}
