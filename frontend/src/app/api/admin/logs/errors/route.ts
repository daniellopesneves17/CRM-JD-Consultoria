// Erros operacionais paginados com opção de marcar como resolvidos.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireAdmin(); if ("response" in access) return access.response;
  try {
    const url = new URL(request.url); const page = Math.max(1, Number(url.searchParams.get("page") ?? 1)); const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50))); const resolvedParam = url.searchParams.get("resolved"); const where = resolvedParam === null ? {} : { resolved: resolvedParam === "true" };
    const [items, total] = await Promise.all([prisma.errorLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.errorLog.count({ where })]);
    return NextResponse.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) { return apiError(error, "Não foi possível carregar os erros."); }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(); if ("response" in access) return access.response;
  try { const body = z.object({ id: z.string().min(1), resolved: z.boolean() }).parse(await request.json()); return NextResponse.json(await prisma.errorLog.update({ where: { id: body.id }, data: { resolved: body.resolved } })); }
  catch (error) { return apiError(error, "Não foi possível atualizar o erro."); }
}
