// Detalhes e mudança de controle BOT/HUMANO de uma conversa.
import { ConvStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  const { id } = await params;
  const item = await prisma.conversation.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) }, include: { lead: true, messages: { orderBy: { sentAt: "asc" } } } });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const { id } = await params; const data = z.object({ status: z.nativeEnum(ConvStatus) }).parse(await request.json());
    const exists = await prisma.conversation.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) } });
    if (!exists) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    return NextResponse.json(await prisma.conversation.update({ where: { id }, data }));
  } catch (error) { return apiError(error); }
}
