// Ações em massa com atualização transacional e escopo do usuário.
import { PipelineStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

const schema = z.object({ ids: z.array(z.string().cuid()).min(1).max(100), action: z.enum(["move", "assign", "delete"]), stage: z.nativeEnum(PipelineStage).optional(), userId: z.string().cuid().nullable().optional() });
export async function POST(request: Request) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try {
    const body = schema.parse(await request.json());
    const where = { id: { in: body.ids }, ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }) };
    if (body.action === "delete") return NextResponse.json({ count: (await prisma.lead.deleteMany({ where })).count });
    if (body.action === "move" && !body.stage) return NextResponse.json({ error: "Informe a nova etapa." }, { status: 400 });
    if (body.action === "assign" && access.session.user.role !== "ADMIN") return NextResponse.json({ error: "Somente o administrador pode redistribuir leads." }, { status: 403 });
    const data = body.action === "move" ? { stage: body.stage } : { userId: body.userId };
    return NextResponse.json({ count: (await prisma.lead.updateMany({ where, data })).count });
  } catch (error) { return apiError(error); }
}
