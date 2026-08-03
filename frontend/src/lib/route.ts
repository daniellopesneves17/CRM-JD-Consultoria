// Utilitários compartilhados para autenticação, autorização e erros de Route Handlers.
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) } as const;
  if (!session.user.crmEnabled) return { response: NextResponse.json({ error: "CRM desabilitado para esta conta." }, { status: 403 }) } as const;
  return { session } as const;
}

export async function requireAdmin() {
  const result = await requireUser();
  if ("response" in result) return result;
  if (result.session.user.role !== "ADMIN") return { response: NextResponse.json({ error: "Acesso exclusivo do administrador." }, { status: 403 }) } as const;
  return result;
}

export function apiError(error: unknown, fallback = "Não foi possível concluir a operação.") {
  if (error instanceof ZodError) return NextResponse.json({ error: "Dados inválidos.", details: error.flatten() }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "Já existe um registro com estes dados." }, { status: 409 });
  }
  console.error("Erro interno do CRM", error instanceof Error ? { name: error.name, message: error.message } : { type: typeof error });
  return NextResponse.json({ error: fallback }, { status: 500 });
}

