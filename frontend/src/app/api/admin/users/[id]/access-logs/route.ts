// Pagina o histórico de acesso e de ações administrativas de um usuário.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const search = new URL(request.url).searchParams;
    const page = Math.max(1, Number(search.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(search.get("limit") || 50)));
    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    const [items, total] = await Promise.all([
      prisma.accessLog.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.accessLog.count({ where: { userId: id } }),
    ]);
    return NextResponse.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    return apiError(error, "Não foi possível carregar o histórico de acesso.");
  }
}
