// Regras globais do administrador e preferências isoladas por corretor.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listAutomationsForActor, setAutomationActiveForActor } from "@/lib/automation-access";
import { apiError, requireAdmin, requireUser } from "@/lib/route";

const schema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(3).max(120),
  trigger: z.string().trim().min(3).max(80),
  delayHours: z.number().int().min(1).max(8760),
  template: z.string().trim().min(3).max(4000),
  active: z.boolean().default(true),
});

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const automations = await listAutomationsForActor({ id: access.session.user.id, role: access.session.user.role });
  return NextResponse.json({ automations, canCreate: access.session.user.role === "ADMIN" });
}

export async function PATCH(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = z.object({ id: z.string().min(1), active: z.boolean() }).parse(await request.json());
    const item = await setAutomationActiveForActor(
      { id: access.session.user.id, role: access.session.user.role },
      body.id,
      body.active,
    );
    await prisma.accessLog.create({
      data: {
        userId: access.session.user.id,
        action: body.active ? "AUTOMATION_ENABLED" : "AUTOMATION_DISABLED",
        detail: `${body.id}:${access.session.user.role === "ADMIN" ? "global" : "own_crm"}`,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(error, "Não foi possível alterar a automação.");
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const body = schema.parse(await request.json());
    const { id, ...data } = body;
    const item = id
      ? await prisma.automationRule.update({ where: { id }, data })
      : await prisma.automationRule.create({ data });
    return NextResponse.json(item, { status: id ? 200 : 201 });
  } catch (error) {
    return apiError(error, "Não foi possível salvar a automação.");
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = z.object({ id: z.string().cuid() }).parse(await request.json());
    await prisma.automationRule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Não foi possível excluir a automação.");
  }
}
