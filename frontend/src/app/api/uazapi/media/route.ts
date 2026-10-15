import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { downloadUazapiMessage, type UazapiConfig } from "@/services/uazapi";

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const url = new URL(request.url);
    const messageId = url.searchParams.get("messageId")?.trim() ?? "";
    const leadId = url.searchParams.get("leadId")?.trim() ?? "";
    if (!messageId || messageId.length > 240 || !leadId) return NextResponse.json({ error: "Mídia inválida." }, { status: 400 });

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...(access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id }) },
      select: { id: true, assignedTo: { select: { uazapiBaseUrl: true, uazapiToken: true } } },
    });
    if (!lead) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
    const reference = await prisma.activity.findFirst({
      where: { leadId, type: "uazapi_message", detail: { contains: messageId } },
      select: { id: true },
    });
    if (!reference) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });

    const config: UazapiConfig | undefined = lead.assignedTo?.uazapiToken && lead.assignedTo.uazapiBaseUrl ? { baseUrl: lead.assignedTo.uazapiBaseUrl, token: lead.assignedTo.uazapiToken } : undefined;
    const result = await downloadUazapiMessage(messageId, config);
    const fileUrl = typeof result.fileURL === "string" ? result.fileURL : "";
    if (!/^https:\/\//i.test(fileUrl)) return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });

    // A URL retornada pela Uazapi pode expirar ou bloquear requisições do navegador.
    // O servidor busca o arquivo imediatamente e o entrega pelo próprio CRM.
    const media = await fetch(fileUrl, { cache: "no-store" });
    if (!media.ok || !media.body) return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
    const headers = new Headers({
      "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
      "Content-Disposition": "inline",
      "Content-Type": media.headers.get("content-type") || "application/octet-stream",
    });
    const length = media.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(media.body, { status: 200, headers });
  } catch (error) {
    return apiError(error, "Não foi possível abrir a mídia do WhatsApp.");
  }
}
