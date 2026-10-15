// Detalhes e mudança de controle BOT/HUMANO de uma conversa.
import { ConvStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  const { id } = await params;
  const ownerId = new URL(_.url).searchParams.get("ownerId")?.trim() || null;
  const item = await prisma.conversation.findFirst({ where: { id, lead: { userId: access.session.user.role === "ADMIN" ? ownerId || "__admin_scope_required__" : access.session.user.id } }, include: { lead: true, messages: { orderBy: { sentAt: "asc" } } } });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const { id } = await params; const requestUrl = new URL(request.url); const ownerId = requestUrl.searchParams.get("ownerId")?.trim() || null; const data = z.object({ status: z.nativeEnum(ConvStatus).optional(), isUrgent: z.boolean().optional() }).refine((value) => value.status !== undefined || value.isUrgent !== undefined).parse(await request.json());
    const exists = await prisma.conversation.findFirst({ where: { id, lead: { userId: access.session.user.role === "ADMIN" ? ownerId || "__admin_scope_required__" : access.session.user.id } } });
    if (!exists) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    return NextResponse.json(await prisma.conversation.update({ where: { id }, data }));
  } catch (error) { return apiError(error); }
}
