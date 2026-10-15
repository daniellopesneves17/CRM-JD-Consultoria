// Comprovantes privados são abertos apenas por um administrador ou pelo corretor atribuído.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { createProfitProofViewUrl } from "@/services/supabase-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;

  try {
    const { id } = await params;
    const entry = await prisma.manualProfit.findFirst({
      where: { id, ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }) },
      select: { proofPath: true },
    });
    if (!entry?.proofPath) return NextResponse.json({ error: "Comprovante não encontrado." }, { status: 404 });
    return NextResponse.redirect(await createProfitProofViewUrl(entry.proofPath));
  } catch (error) {
    return apiError(error, "Não foi possível abrir o comprovante.");
  }
}
