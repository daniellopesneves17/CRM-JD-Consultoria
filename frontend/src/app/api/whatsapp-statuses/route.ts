import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { normalizeUazapiStatus } from "@/lib/uazapi-status";
import { findUazapiStatuses, resolveUazapiConfig, sendUazapiTextStatus } from "@/services/uazapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postSchema = z.object({
  ownerId: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).max(656),
  backgroundColor: z.number().int().min(1).max(19).default(19),
  font: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10)]).default(0),
  maxRecipients: z.number().int().min(1).max(500).default(100),
});

async function resolveOwner(actor: { id: string; role: "ADMIN" | "CORRETOR" }, requestedOwnerId?: string | null) {
  const ownerId = actor.role === "ADMIN" ? requestedOwnerId?.trim() : actor.id;
  if (!ownerId) throw new Error("Selecione o CRM de um corretor antes de acessar os Status.");
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, active: true, crmEnabled: true },
    select: { id: true, name: true, email: true, uazapiBaseUrl: true, uazapiToken: true },
  });
  if (!owner) throw new Error("CRM do corretor não encontrado.");
  const config = resolveUazapiConfig(owner);
  if (!config) throw new Error("WhatsApp não configurado para este corretor.");
  return { owner, config };
}

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const offset = Math.max(0, Math.min(10_000, Number(params.get("offset")) || 0));
    const { owner, config } = await resolveOwner(
      { id: access.session.user.id, role: access.session.user.role },
      params.get("ownerId"),
    );
    const result = await findUazapiStatuses(offset, 50, config);
    return NextResponse.json({
      owner: { id: owner.id, name: owner.name },
      items: result.statuses.map(normalizeUazapiStatus).filter((item) => item !== null),
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && /Selecione|não encontrado|não configurado/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Não foi possível carregar os Status do WhatsApp.");
  }
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = postSchema.parse(await request.json());
    const { owner, config } = await resolveOwner(
      { id: access.session.user.id, role: access.session.user.role },
      body.ownerId,
    );
    const sent = await sendUazapiTextStatus(body.text, {
      backgroundColor: body.backgroundColor,
      font: body.font,
      maxRecipients: body.maxRecipients,
    }, config);
    await prisma.accessLog.create({
      data: {
        userId: access.session.user.id,
        action: "whatsapp_status_posted",
        detail: JSON.stringify({ ownerId: owner.id, type: "text", maxRecipients: body.maxRecipients }),
      },
    });
    return NextResponse.json({ ok: true, id: typeof sent.Id === "string" ? sent.Id : null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Revise o texto e as opções do Status." }, { status: 400 });
    if (error instanceof Error && /Selecione|não encontrado|não configurado/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Não foi possível publicar o Status.");
  }
}
