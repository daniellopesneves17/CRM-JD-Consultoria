// Consulta, atualiza e remove usuários com proteção da conta atual e do último admin.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { firstResponseAverage, percentage, requestOrigin, updateUserSchema } from "@/lib/admin-users";

type Context = { params: Promise<{ id: string }> };
const activeStages = ["NOVO", "QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE", "NEGOCIACAO"] as const;
const openStages = ["NOVO", "QUALIFICADO"] as const;
const pipelineStages = ["NOVO", "QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE", "NEGOCIACAO", "FECHADO", "PERDIDO"] as const;

export async function GET(_: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true, role: true, active: true, crmEnabled: true,
        avatarUrl: true, lastLoginAt: true, loginCount: true, createdAt: true, updatedAt: true,
        accessLogs: { orderBy: { createdAt: "desc" }, take: 10 },
        leads: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true, name: true, stage: true, estimatedValue: true,
            conversations: { select: { messages: { orderBy: { sentAt: "asc" }, select: { sender: true, sentAt: true } } } },
          },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    const activeLeads = user.leads.filter((lead) => activeStages.includes(lead.stage as typeof activeStages[number]));
    const openLeads = user.leads.filter((lead) => openStages.includes(lead.stage as typeof openStages[number]));
    const closedLeads = user.leads.filter((lead) => lead.stage === "FECHADO");
    const lostLeads = user.leads.filter((lead) => lead.stage === "PERDIDO");
    const conversations = user.leads.flatMap((lead) => lead.conversations);
    const distribution = pipelineStages.map((stage) => ({ stage, total: user.leads.filter((lead) => lead.stage === stage).length }));
    const samples = (items: typeof user.leads) => items.slice(0, 5).map(({ id: leadId, name, stage }) => ({ id: leadId, name, stage }));
    const { leads, ...profile } = user;
    return NextResponse.json({
      user: profile,
      stats: {
        totalLeads: leads.length,
        activeLeads: activeLeads.length,
        closedLeads: closedLeads.length,
        lostLeads: lostLeads.length,
        mrr: closedLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0),
        conversionRate: percentage(closedLeads.length, leads.length),
        avgResponseTime: firstResponseAverage(conversations),
      },
      distribution,
      transferPreview: {
        all: { count: leads.length, samples: samples(leads) },
        active: { count: activeLeads.length, samples: samples(activeLeads) },
        open: { count: openLeads.length, samples: samples(openLeads) },
      },
    });
  } catch (error) {
    return apiError(error, "Não foi possível carregar o perfil do corretor.");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    if (id === access.session.user.id) return NextResponse.json({ error: "Você não pode modificar a própria conta por esta área." }, { status: 400 });
    const body = updateUserSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true, email: true } });
    if (!existing) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (body.email && body.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
      if (duplicate) return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }
    const removesActiveAdmin = existing.role === "ADMIN" && existing.active && (body.role === "CORRETOR" || body.active === false);
    const origin = requestOrigin(request);
    const updated = await prisma.$transaction(async (tx) => {
      if (removesActiveAdmin) {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", active: true } });
        if (activeAdmins <= 1) throw new Error("LAST_ACTIVE_ADMIN");
      }
      const user = await tx.user.update({
        where: { id },
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone === undefined ? undefined : body.phone || null,
          role: body.role,
          active: body.active,
          ...(body.active === false ? { sessionVersion: { increment: 1 } } : {}),
        },
        select: { id: true, name: true, email: true, phone: true, role: true, active: true, avatarUrl: true, lastLoginAt: true, loginCount: true, createdAt: true },
      });
      await tx.accessLog.create({ data: { userId: id, action: "profile_updated", detail: `Cadastro atualizado por ${access.session.user.name || access.session.user.email}.`, ...origin } });
      return user;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") return NextResponse.json({ error: "Deve existir ao menos um administrador ativo." }, { status: 400 });
    return apiError(error, "Não foi possível atualizar o usuário.");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    if (id === access.session.user.id) return NextResponse.json({ error: "Você não pode remover a própria conta." }, { status: 400 });
    const origin = requestOrigin(request);
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { name: true, email: true, role: true, active: true } });
      if (!target) throw new Error("USER_NOT_FOUND");
      if (target.role === "ADMIN" && target.active) {
        const activeAdmins = await tx.user.count({ where: { role: "ADMIN", active: true } });
        if (activeAdmins <= 1) throw new Error("LAST_ACTIVE_ADMIN");
      }
      await tx.user.delete({ where: { id } });
      await tx.accessLog.create({ data: { userId: access.session.user.id, action: "user_deleted", detail: `Conta de ${target.name} (${target.email}) removida.`, ...origin } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") return NextResponse.json({ error: "O último administrador ativo não pode ser removido." }, { status: 400 });
    return apiError(error, "Não foi possível remover o usuário.");
  }
}
