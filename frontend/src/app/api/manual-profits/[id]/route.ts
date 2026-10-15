// Estorno preserva o histórico financeiro em vez de apagar definitivamente o lançamento.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;

  try {
    const { id } = await params;
    const entry = await prisma.manualProfit.findFirst({
      where: {
        id,
        voidedAt: null,
        ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }),
      },
      select: { id: true, amount: true, userId: true },
    });
    if (!entry) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

    await prisma.$transaction([
      prisma.manualProfit.update({
        where: { id: entry.id },
        data: { voidedAt: new Date(), voidedById: access.session.user.id },
      }),
      prisma.accessLog.create({
        data: {
          userId: access.session.user.id,
          action: "MANUAL_PROFIT_VOIDED",
          detail: JSON.stringify({ entryId: entry.id, amount: Number(entry.amount), beneficiaryUserId: entry.userId }),
        },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Não foi possível estornar o lançamento.");
  }
}
