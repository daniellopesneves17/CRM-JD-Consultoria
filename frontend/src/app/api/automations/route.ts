// CRUD das regras de automação; somente administradores podem alterar regras.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin, requireUser } from "@/lib/route";
const schema = z.object({ id: z.string().cuid().optional(), name: z.string().trim().min(3).max(120), trigger: z.string().trim().min(3).max(80), delayHours: z.number().int().min(1).max(8760), template: z.string().trim().min(3).max(4000), active: z.boolean().default(true) });
export async function GET() { const access = await requireUser(); if ("response" in access) return access.response; return NextResponse.json(await prisma.automationRule.findMany({ orderBy: { createdAt: "asc" } })); }
export async function POST(request: Request) { const access = await requireAdmin(); if ("response" in access) return access.response; try { const body = schema.parse(await request.json()); const { id, ...data } = body; const item = id ? await prisma.automationRule.update({ where: { id }, data }) : await prisma.automationRule.create({ data }); return NextResponse.json(item, { status: id ? 200 : 201 }); } catch (error) { return apiError(error, "Não foi possível salvar a automação."); } }
export async function DELETE(request: Request) { const access = await requireAdmin(); if ("response" in access) return access.response; try { const { id } = z.object({ id: z.string().cuid() }).parse(await request.json()); await prisma.automationRule.delete({ where: { id } }); return new NextResponse(null, { status: 204 }); } catch (error) { return apiError(error, "Não foi possível excluir a automação."); } }

