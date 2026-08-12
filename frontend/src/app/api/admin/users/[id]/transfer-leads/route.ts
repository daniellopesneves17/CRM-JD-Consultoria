// Transfere carteiras em lote e registra o histórico no usuário e em cada lead.
import { NextResponse } from "next/server";
import { z } from "zod";
import type { PipelineStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { requestOrigin } from "@/lib/admin-users";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  targetUserId: z.string().min(1),
  filter: z.enum(["all", "active", "open"]),
  registerHistory: z.boolean().default(true),
});

export async function POST(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    if (id === body.targetUserId) return NextResponse.json({ error: "Origem e destino devem ser diferentes." }, { status: 400 });
    const origin = requestOrigin(request);
    const result = await prisma.$transaction(async (tx) => {
      const [source, target] = await Promise.all([
        tx.user.findUnique({ where: { id }, select: { id: true, name: true } }),
        tx.user.findUnique({ where: { id: body.targetUserId }, select: { id: true, name: true, role: true, active: true, crmEnabled: true } }),
      ]);
      if (!source) throw new Error("SOURCE_NOT_FOUND");
      if (!target || !target.active || !target.crmEnabled || target.role !== "CORRETOR") throw new Error("TARGET_INVALID");
      const selectedStages: PipelineStage[] | undefined = body.filter === "active"
        ? ["NOVO", "QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE", "NEGOCIACAO"]
        : body.filter === "open" ? ["NOVO", "QUALIFICADO"] : undefined;
      const leads = await tx.lead.findMany({
        where: { userId: id, ...(selectedStages ? { stage: { in: selectedStages } } : {}) },
        select: { id: true },
      });
      if (leads.length) {
        const ids = leads.map((lead) => lead.id);
        await tx.lead.updateMany({ where: { id: { in: ids } }, data: { userId: target.id } });
        if (body.registerHistory) {
          await tx.activity.createMany({
            data: ids.map((leadId) => ({
              leadId,
              type: "lead_transferred",
              detail: `Lead transferido de ${source.name} para ${target.name} por ${access.session.user.name || access.session.user.email}.`,
            })),
          });
        }
      }
      const detail = `${leads.length} leads transferidos de ${source.name} para ${target.name}.`;
      await tx.accessLog.createMany({
        data: [
          { userId: source.id, action: "leads_transferred", detail, ...origin },
          { userId: target.id, action: "leads_received", detail, ...origin },
        ],
      });
      return { transferred: leads.length };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SOURCE_NOT_FOUND") return NextResponse.json({ error: "Usuário de origem não encontrado." }, { status: 404 });
    if (error instanceof Error && error.message === "TARGET_INVALID") return NextResponse.json({ error: "Selecione um corretor de destino ativo." }, { status: 400 });
    return apiError(error, "Não foi possível transferir a carteira.");
  }
}
