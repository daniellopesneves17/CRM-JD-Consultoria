// Importação validada de até 50 contatos com deduplicação e propostas aceitas automáticas.
import { NextResponse } from "next/server";
import { PipelineStage } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeBrazilPhone } from "@/lib/admin-data";
import { apiError, requireAdmin } from "@/lib/route";

const lineSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  phone: z.string().trim().min(8, "WhatsApp é obrigatório"),
  operator: z.string().trim().max(100).optional(),
  livesCount: z.number().int().min(1).max(100).default(1),
  estimatedValue: z.number().nonnegative().max(1_000_000).optional(),
  stage: z.nativeEnum(PipelineStage).default(PipelineStage.NOVO),
  notes: z.string().trim().max(1000).optional()
});
const requestSchema = z.object({ leads: z.array(z.unknown()).min(1).max(50) });

type Prepared = z.infer<typeof lineSchema> & { line: number; phone: string };

export async function GET(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const values = new URL(request.url).searchParams.getAll("phone").slice(0, 50);
  const phones = values.flatMap((value) => { try { return [normalizeBrazilPhone(value)]; } catch { return []; } });
  const existing = phones.length ? await prisma.lead.findMany({ where: { phone: { in: phones } }, select: { phone: true } }) : [];
  return NextResponse.json({ existing: existing.map((item) => item.phone) });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const input = requestSchema.parse(await request.json());
    const errors: Array<{ line: number; reason: string }> = [];
    const prepared: Prepared[] = [];
    const seen = new Set<string>();
    input.leads.forEach((raw, index) => {
      const parsed = lineSchema.safeParse(raw);
      if (!parsed.success) { errors.push({ line: index + 1, reason: parsed.error.issues[0]?.message ?? "Linha inválida" }); return; }
      try {
        const phone = normalizeBrazilPhone(parsed.data.phone);
        if (seen.has(phone)) { errors.push({ line: index + 1, reason: "WhatsApp duplicado na importação" }); return; }
        seen.add(phone);
        prepared.push({ ...parsed.data, phone, line: index + 1 });
      } catch (error) { errors.push({ line: index + 1, reason: error instanceof Error ? error.message : "WhatsApp inválido" }); }
    });
    if (!prepared.length) return NextResponse.json({ created: 0, skipped: errors.length, errors });

    const existing = await prisma.lead.findMany({ where: { phone: { in: prepared.map((item) => item.phone) } }, select: { phone: true } });
    const existingPhones = new Set(existing.map((item) => item.phone));
    const creatable = prepared.filter((item) => {
      if (!existingPhones.has(item.phone)) return true;
      errors.push({ line: item.line, reason: "Este WhatsApp já existe no sistema" });
      return false;
    });
    if (!creatable.length) return NextResponse.json({ created: 0, skipped: errors.length, errors });

    await prisma.$transaction(async (tx) => {
      await tx.lead.createMany({ data: creatable.map((item) => ({ name: item.name, phone: item.phone, currentOperator: item.operator || null, livesCount: item.livesCount, estimatedValue: item.estimatedValue, stage: item.stage, notes: item.notes, source: "IMPORTACAO" as const, userId: access.session.user.id, lastActivityAt: new Date() })) });
      const createdLeads = await tx.lead.findMany({ where: { phone: { in: creatable.map((item) => item.phone) } }, select: { id: true, phone: true, name: true, livesCount: true, currentOperator: true, stage: true, estimatedValue: true } });
      const accepted = createdLeads.filter((lead) => lead.stage === "FECHADO" && Number(lead.estimatedValue ?? 0) > 0);
      if (accepted.length) await tx.proposal.createMany({ data: accepted.map((lead) => ({ leadId: lead.id, operator: lead.currentOperator ?? "Não informada", plan: "Importado", coverage: "A confirmar", monthlyValue: lead.estimatedValue!, lives: Array.from({ length: lead.livesCount }, (_, index) => ({ name: `Vida ${index + 1}` })), status: "ACEITA" as const, acceptedAt: new Date() })) });
    });
    return NextResponse.json({ created: creatable.length, skipped: errors.length, errors }, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível importar os contatos.");
  }
}
