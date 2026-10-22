import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { backupConversationPreview, decryptWhatsAppBackup } from "@/lib/whatsapp-backup";
import { downloadWhatsAppBackup } from "@/services/supabase-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  path: z.string().min(1).max(500),
  password: z.string().min(10).max(128),
  ownerId: z.string().trim().min(1).optional(),
  conversationId: z.string().trim().min(1).optional(),
  query: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).max(10000).default(1),
});

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = schema.parse(await request.json());
    const ownerId = access.session.user.role === "ADMIN" ? body.ownerId : access.session.user.id;
    if (!ownerId) return NextResponse.json({ error: "Selecione o CRM de um corretor." }, { status: 400 });
    if (!body.path.startsWith(`${ownerId}/`) || body.path.includes("../") || !body.path.endsWith(".jdbackup")) {
      return NextResponse.json({ error: "Backup inválido." }, { status: 400 });
    }
    if (access.session.user.role === "ADMIN") {
      const exists = await prisma.user.count({ where: { id: ownerId, active: true, crmEnabled: true } });
      if (!exists) return NextResponse.json({ error: "CRM do corretor não encontrado." }, { status: 404 });
    }
    const indexedBackup = await prisma.whatsAppBackup.findFirst({
      where: { ownerId, storagePath: body.path },
      select: { id: true },
    });
    if (!indexedBackup) return NextResponse.json({ error: "Backup não encontrado no cofre do Supabase." }, { status: 404 });
    const encrypted = await downloadWhatsAppBackup(body.path);
    const payload = await decryptWhatsAppBackup(encrypted, body.password);
    if (payload.owner.id !== ownerId) return NextResponse.json({ error: "Este backup pertence a outro CRM." }, { status: 403 });

    if (body.conversationId) {
      const conversation = payload.conversations.find((item) => item.id === body.conversationId);
      if (!conversation) return NextResponse.json({ error: "Conversa não encontrada no backup." }, { status: 404 });
      return NextResponse.json({ conversation }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const query = body.query?.toLocaleLowerCase("pt-BR") ?? "";
    const matches = query
      ? payload.conversations.filter((item) => `${item.lead.name} ${item.lead.phone}`.toLocaleLowerCase("pt-BR").includes(query))
      : payload.conversations;
    const pageSize = 100;
    const start = (body.page - 1) * pageSize;
    const items = matches.slice(start, start + pageSize).map((conversation) => ({
      id: conversation.id,
      lead: conversation.lead,
      status: conversation.status,
      sentiment: conversation.sentiment,
      isUrgent: conversation.isUrgent,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messages.length,
      preview: backupConversationPreview(conversation),
    }));
    if (body.page === 1) {
      await prisma.$transaction([
        prisma.whatsAppBackup.update({ where: { id: indexedBackup.id }, data: { lastOpenedAt: new Date() } }),
        prisma.accessLog.create({
          data: {
            userId: access.session.user.id,
            action: "whatsapp_backup_opened",
            detail: JSON.stringify({ ownerId, exportedAt: payload.exportedAt, conversationCount: payload.conversations.length }),
          },
        }),
      ]);
    }
    return NextResponse.json({
      backup: {
        exportedAt: payload.exportedAt,
        owner: payload.owner,
        conversationCount: payload.conversations.length,
        messageCount: payload.conversations.reduce((total, conversation) => total + conversation.messages.length, 0),
      },
      items,
      total: matches.length,
      page: body.page,
      pages: Math.ceil(matches.length / pageSize),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados do backup inválidos." }, { status: 400 });
    if (error instanceof Error && /Senha incorreta|Arquivo de backup|Formato de backup/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return apiError(error, "Não foi possível abrir o backup.");
  }
}
