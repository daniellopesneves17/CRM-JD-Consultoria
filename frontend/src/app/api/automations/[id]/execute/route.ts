import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { executeAutomationForActor } from "@/lib/automation-execution";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

export const maxDuration = 300;

const schema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  userId: z.string().min(1).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const actor = { id: access.session.user.id, role: access.session.user.role as Role };
    const result = await executeAutomationForActor(id, actor, body.limit, body.userId);
    await prisma.accessLog.create({
      data: {
        userId: actor.id,
        action: "AUTOMATION_MANUAL_EXECUTION",
        detail: `${id}:${actor.role === Role.ADMIN ? body.userId ?? "all_crms" : "own_crm"}:${JSON.stringify(result)}`.slice(0, 5000),
      },
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof Error && /^(Automa[cç][aã]o|Ative|Conecte|O CRM)/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Não foi possível executar a automação agora.");
  }
}
