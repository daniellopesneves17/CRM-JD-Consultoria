// Lista corretores com métricas e cria novas contas sem expor hashes de senha.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { createUserSchema, requestOrigin } from "@/lib/admin-users";

const activeStages = ["NOVO", "QUALIFICADO", "PROPOSTA_ENVIADA", "EM_ANALISE", "NEGOCIACAO"] as const;

export async function GET(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const activeParam = params.get("active");
    const roleParam = params.get("role");
    const search = params.get("search")?.trim();
    const active = activeParam === "true" ? true : activeParam === "false" ? false : undefined;
    const role = roleParam === "ADMIN" || roleParam === "CORRETOR" ? roleParam : undefined;
    const users = await prisma.user.findMany({
      where: {
        active,
        role,
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true, name: true, email: true, phone: true, role: true, active: true, crmEnabled: true,
        avatarUrl: true, lastLoginAt: true, loginCount: true, createdAt: true,
        leads: { select: { stage: true } },
      },
    });
    return NextResponse.json({
      users: users.map(({ leads, ...user }) => ({
        ...user,
        activeLeads: leads.filter((lead) => activeStages.includes(lead.stage as typeof activeStages[number])).length,
        closedLeads: leads.filter((lead) => lead.stage === "FECHADO").length,
      })),
      total: users.length,
    });
  } catch (error) {
    return apiError(error, "Não foi possível carregar os corretores.");
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const body = createUserSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    const passwordHash = await bcrypt.hash(body.password, 12);
    const origin = requestOrigin(request);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        role: body.role,
        passwordHash,
        accessLogs: {
          create: {
            action: "user_created",
            detail: `Conta criada por ${access.session.user.name || access.session.user.email}.`,
            ...origin,
          },
        },
      },
      select: { id: true, name: true, email: true, phone: true, role: true, active: true, avatarUrl: true, lastLoginAt: true, loginCount: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError(error, "Não foi possível criar o corretor.");
  }
}
