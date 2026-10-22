import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { downloadUazapiMessage, findUazapiMessage, resolveUazapiConfig } from "@/services/uazapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const messageId = params.get("messageId")?.trim() ?? "";
    const requestedOwnerId = params.get("ownerId")?.trim();
    const ownerId = access.session.user.role === "ADMIN" ? requestedOwnerId : access.session.user.id;
    if (!ownerId || !messageId || messageId.length > 240) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    const owner = await prisma.user.findFirst({
      where: { id: ownerId, active: true, crmEnabled: true },
      select: { email: true, uazapiBaseUrl: true, uazapiToken: true },
    });
    const config = resolveUazapiConfig(owner ?? undefined);
    if (!owner || !config) return NextResponse.json({ error: "Status não encontrado." }, { status: 404 });
    const reference = await findUazapiMessage(messageId, config);
    if (!reference || reference.chatid !== "status@broadcast") return NextResponse.json({ error: "Status não encontrado." }, { status: 404 });
    const downloaded = await downloadUazapiMessage(messageId, config);
    const fileUrl = typeof downloaded.fileURL === "string" ? downloaded.fileURL : "";
    if (!/^https:\/\//i.test(fileUrl)) return NextResponse.json({ error: "Mídia indisponível." }, { status: 404 });
    const media = await fetch(fileUrl, { cache: "no-store" });
    if (!media.ok || !media.body) return NextResponse.json({ error: "Mídia indisponível." }, { status: 404 });
    const headers = new Headers({
      "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
      "Content-Disposition": "inline",
      "Content-Type": media.headers.get("content-type") || "application/octet-stream",
    });
    return new Response(media.body, { headers });
  } catch (error) {
    return apiError(error, "Não foi possível abrir a mídia do Status.");
  }
}
