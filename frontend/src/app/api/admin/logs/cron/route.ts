// Histórico paginado das rotinas automáticas executadas.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const url = new URL(request.url); const page = Math.max(1, Number(url.searchParams.get("page") ?? 1)); const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const [items, total] = await Promise.all([prisma.cronLog.findMany({ orderBy: { startedAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.cronLog.count()]);
    return NextResponse.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) { return apiError(error, "Não foi possível carregar os cron jobs."); }
}
