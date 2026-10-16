import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { syncUazapiHistory } from "@/lib/uazapi-history-sync";
import { resolveUazapiConfig } from "@/services/uazapi";

export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() || (access.session.user.role === "ADMIN" ? null : access.session.user.id);
    if (!ownerId) return NextResponse.json({ error: "Selecione um CRM para sincronizar." }, { status: 400 });
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true },
    });
    if (!owner?.active || !owner.crmEnabled) return NextResponse.json({ error: "Responsável da Uazapi indisponível." }, { status: 503 });
    if (access.session.user.role !== "ADMIN" && access.session.user.id !== owner.id) {
      return NextResponse.json({ error: "Nenhuma conexão de WhatsApp está configurada para este perfil." }, { status: 403 });
    }
    if (!resolveUazapiConfig(owner)) return NextResponse.json({ error: "Nenhuma conexão de WhatsApp está configurada para este perfil." }, { status: 403 });
    const result = await syncUazapiHistory(owner, { includeChats: true, maxPages: 10, pageSize: 1000 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error, "Não foi possível sincronizar o histórico do WhatsApp.");
  }
}
