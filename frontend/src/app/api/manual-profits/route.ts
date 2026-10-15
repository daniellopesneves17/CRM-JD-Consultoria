// Lançamentos manuais de lucro, visíveis conforme o escopo do usuário autenticado.
import { ManualProfitCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { resolveManualProfitBeneficiary } from "@/lib/manual-profit-policy";
import { profitProofExists, validateProfitProof } from "@/services/supabase-storage";

const schema = z.object({
  amount: z.number().positive().max(100_000_000),
  description: z.string().trim().min(2).max(160),
  category: z.nativeEnum(ManualProfitCategory),
  occurredAt: z.coerce.date(),
  userId: z.string().cuid().nullable().optional(),
  proofPath: z.string().trim().max(500).optional(),
  proofName: z.string().trim().min(1).max(255).optional(),
  proofType: z.string().trim().max(100).optional(),
  proofSize: z.number().int().positive().optional(),
});

const entryInclude = {
  user: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export async function GET() {
  const access = await requireUser();
  if ("response" in access) return access.response;

  try {
    const isAdmin = access.session.user.role === "ADMIN";
    const scope = isAdmin ? {} : { userId: access.session.user.id };
    const [entries, users, total] = await Promise.all([
      prisma.manualProfit.findMany({
        where: { voidedAt: null, ...scope },
        include: entryInclude,
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      isAdmin
        ? prisma.user.findMany({
            where: { role: "CORRETOR", active: true, crmEnabled: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      prisma.manualProfit.aggregate({ where: { voidedAt: null, ...scope }, _sum: { amount: true } }),
    ]);

    return NextResponse.json({ entries, users, total: Number(total._sum.amount ?? 0) });
  } catch (error) {
    return apiError(error, "Não foi possível carregar os lucros manuais.");
  }
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;

  try {
    const body = schema.parse(await request.json());
    const isAdmin = access.session.user.role === "ADMIN";
    const hasProof = Boolean(body.proofPath && body.proofName && body.proofType && body.proofSize);
    let userId: string | null;
    try {
      userId = resolveManualProfitBeneficiary({
        actorId: access.session.user.id,
        hasProof,
        isAdmin,
        requestedUserId: body.userId,
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    if (body.proofPath || body.proofName || body.proofType || body.proofSize) {
      if (!hasProof) return NextResponse.json({ error: "Os dados do comprovante estão incompletos." }, { status: 400 });
      const prefix = `manual-profits/${access.session.user.id}/`;
      if (!body.proofPath!.startsWith(prefix) || !/\.(png|jpg|webp|pdf)$/.test(body.proofPath!)) return NextResponse.json({ error: "Comprovante inválido." }, { status: 400 });
      try { validateProfitProof(body.proofType, body.proofSize); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
      if (!(await profitProofExists(body.proofPath!))) return NextResponse.json({ error: "O comprovante enviado não foi encontrado." }, { status: 400 });
    }

    if (userId) {
      const beneficiary = await prisma.user.findFirst({
        where: { id: userId, role: "CORRETOR", active: true, crmEnabled: true },
        select: { id: true },
      });
      if (!beneficiary) return NextResponse.json({ error: "Corretor inválido ou indisponível." }, { status: 400 });
    }

    const [entry] = await prisma.$transaction([
      prisma.manualProfit.create({
        data: {
          amount: body.amount,
          description: body.description,
          category: body.category,
          occurredAt: body.occurredAt,
          proofPath: body.proofPath,
          proofName: body.proofName,
          proofType: body.proofType,
          proofSize: body.proofSize,
          userId,
          createdById: access.session.user.id,
        },
        include: entryInclude,
      }),
      prisma.accessLog.create({
        data: {
          userId: access.session.user.id,
          action: "MANUAL_PROFIT_CREATED",
          detail: JSON.stringify({ amount: body.amount, category: body.category, beneficiaryUserId: userId, proofAttached: hasProof }),
        },
      }),
    ]);

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível registrar o lucro manual.");
  }
}
