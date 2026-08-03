// Disponibilidade global e política de publicação do CRM.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
export async function GET() { const access = await requireAdmin(); if ("response" in access) return access.response; return NextResponse.json(await prisma.systemSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } })); }
export async function PATCH(request: Request) { const access = await requireAdmin(); if ("response" in access) return access.response; try { const body = z.object({ crmEnabled: z.boolean().optional(), updatePolicy: z.enum(["AUTOMATIC", "ON_COMPLETION"]).optional(), maintenanceMessage: z.string().trim().min(3).max(240).optional() }).parse(await request.json()); return NextResponse.json(await prisma.systemSettings.upsert({ where: { id: "global" }, update: body, create: { id: "global", ...body } })); } catch (error) { return apiError(error, "Não foi possível salvar as configurações."); } }
