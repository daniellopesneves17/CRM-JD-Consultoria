// Redefine a senha, invalida sessões anteriores e registra a ação de auditoria.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { requestOrigin, resetPasswordSchema } from "@/lib/admin-users";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    if (id === access.session.user.id) return NextResponse.json({ error: "Use a área de segurança da sua conta para alterar sua própria senha." }, { status: 400 });
    const body = resetPasswordSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(body.password, 12);
    const origin = requestOrigin(request);
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true } });
      if (!target) throw new Error("USER_NOT_FOUND");
      await tx.user.update({ where: { id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.accessLog.create({
        data: {
          userId: id,
          action: "password_reset",
          detail: `Senha ${body.type === "generated" ? "temporária gerada" : "definida manualmente"} por ${access.session.user.name || access.session.user.email}. Sessões anteriores invalidadas.`,
          ...origin,
        },
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    return apiError(error, "Não foi possível redefinir a senha.");
  }
}
