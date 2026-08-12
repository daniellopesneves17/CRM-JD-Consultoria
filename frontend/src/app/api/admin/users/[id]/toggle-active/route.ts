// Ativa ou desativa uma conta preservando seus dados e protegendo o último admin.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { requestOrigin } from "@/lib/admin-users";

type Context = { params: Promise<{ id: string }> };
const inactiveStages = ["FECHADO", "PERDIDO"] as const;

export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    if (id === access.session.user.id) return NextResponse.json({ error: "Você não pode desativar a própria conta." }, { status: 400 });
    const origin = requestOrigin(request);
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { active: true, role: true } });
      if (!target) throw new Error("USER_NOT_FOUND");
      if (target.active && target.role === "ADMIN") {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", active: true } });
        if (activeAdmins <= 1) throw new Error("LAST_ACTIVE_ADMIN");
      }
      const activeLeads = await tx.lead.count({ where: { userId: id, stage: { notIn: [...inactiveStages] } } });
      const nextActive = !target.active;
      await tx.user.update({
        where: { id },
        data: { active: nextActive, ...(nextActive ? {} : { sessionVersion: { increment: 1 } }) },
      });
      await tx.accessLog.create({
        data: {
          userId: id,
          action: nextActive ? "account_activated" : "account_deactivated",
          detail: `Conta ${nextActive ? "ativada" : "desativada"} por ${access.session.user.name || access.session.user.email}.`,
          ...origin,
        },
      });
      return { active: nextActive, activeLeads };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") return NextResponse.json({ error: "O último administrador ativo não pode ser desativado." }, { status: 400 });
    return apiError(error, "Não foi possível alterar o status da conta.");
  }
}
