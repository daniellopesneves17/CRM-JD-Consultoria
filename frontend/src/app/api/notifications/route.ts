import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { syncActionableNotifications } from "@/lib/notifications";

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    await syncActionableNotifications({ id: access.session.user.id, role: access.session.user.role });
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: access.session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: access.session.user.id, readAt: null } }),
    ]);
    return NextResponse.json({ items, unread });
  } catch (error) {
    return apiError(error, "Não foi possível carregar as notificações.");
  }
}

const patchSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ id: z.string().cuid() }),
]);

export async function PATCH(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = patchSchema.parse(await request.json());
    const result = await prisma.notification.updateMany({
      where: {
        userId: access.session.user.id,
        readAt: null,
        ...(body && "id" in body ? { id: body.id } : {}),
      },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    return apiError(error, "Não foi possível atualizar a notificação.");
  }
}
