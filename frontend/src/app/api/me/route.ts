import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accountSettingsSchema } from "@/lib/account-settings";
import { requestOrigin } from "@/lib/admin-users";
import { apiError, requireUser } from "@/lib/route";

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const user = await prisma.user.findUnique({
    where: { id: access.session.user.id },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true, lastLoginAt: true, loginCount: true, createdAt: true },
  });
  return user ? NextResponse.json(user) : NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
}

export async function PATCH(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = accountSettingsSchema.parse(await request.json());
    const origin = requestOrigin(request);
    if (body.type === "profile") {
      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: access.session.user.id },
          data: { name: body.name, phone: body.phone || null },
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true, lastLoginAt: true, loginCount: true, createdAt: true },
        });
        await tx.accessLog.create({ data: { userId: updated.id, action: "self_profile_updated", detail: "Dados pessoais atualizados pelo próprio usuário.", ...origin } });
        return updated;
      });
      return NextResponse.json(user);
    }

    const user = await prisma.user.findUnique({ where: { id: access.session.user.id }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 });
    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: access.session.user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
      prisma.accessLog.create({ data: { userId: access.session.user.id, action: "self_password_changed", detail: "Senha alterada pelo próprio usuário; sessões anteriores invalidadas.", ...origin } }),
    ]);
    return NextResponse.json({ success: true, reauthenticate: true });
  } catch (error) {
    return apiError(error, "Não foi possível atualizar sua conta.");
  }
}
