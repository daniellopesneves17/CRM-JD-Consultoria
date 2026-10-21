import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import {
  encryptWhatsAppBackup,
  parseWhatsAppBackupFileName,
  whatsappBackupFileName,
  type WhatsAppBackupPayload,
} from "@/lib/whatsapp-backup";
import {
  deleteWhatsAppBackup,
  downloadWhatsAppBackup,
  listWhatsAppBackups,
  uploadWhatsAppBackup,
} from "@/services/supabase-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const createSchema = z.object({
  password: z.string().min(10).max(128),
  ownerId: z.string().trim().min(1).optional(),
});

async function resolveOwner(actor: { id: string; role: "ADMIN" | "CORRETOR" }, requestedOwnerId?: string | null) {
  const ownerId = actor.role === "ADMIN" ? requestedOwnerId?.trim() : actor.id;
  if (!ownerId) throw new Error("Selecione o CRM de um corretor antes de acessar os backups.");
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, ...(actor.role === "ADMIN" ? { active: true, crmEnabled: true } : {}) },
    select: { id: true, name: true },
  });
  if (!owner) throw new Error("CRM do corretor não encontrado.");
  return owner;
}

function authorizedPath(ownerId: string, path: string) {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized.startsWith(`${ownerId}/`) || normalized.includes("../") || !normalized.endsWith(".jdbackup")) {
    throw new Error("Backup inválido.");
  }
  return normalized;
}

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const owner = await resolveOwner(
      { id: access.session.user.id, role: access.session.user.role },
      params.get("ownerId"),
    );
    const downloadPath = params.get("download");
    if (downloadPath) {
      const path = authorizedPath(owner.id, downloadPath);
      const file = await downloadWhatsAppBackup(path);
      return new Response(file, {
        headers: {
          "Content-Type": "application/vnd.jd-consultoria.whatsapp-backup+json",
          "Content-Disposition": `attachment; filename="${path.split("/").at(-1)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    const files = await listWhatsAppBackups(owner.id);
    return NextResponse.json({
      owner,
      items: files.map((file) => ({
        path: `${owner.id}/${file.name}`,
        name: file.name,
        size: typeof file.metadata?.size === "number" ? file.metadata.size : 0,
        createdAt: file.created_at,
        ...parseWhatsAppBackupFileName(file.name),
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && /Selecione|não encontrado|inválido/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Não foi possível carregar os backups do WhatsApp.");
  }
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = createSchema.parse(await request.json());
    const owner = await resolveOwner(
      { id: access.session.user.id, role: access.session.user.role },
      body.ownerId,
    );
    const rows = await prisma.conversation.findMany({
      where: { lead: { userId: owner.id } },
      select: {
        id: true,
        status: true,
        sentiment: true,
        isUrgent: true,
        aiSummary: true,
        createdAt: true,
        updatedAt: true,
        lead: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        messages: {
          where: { content: { notIn: ["[chamada]"] } },
          orderBy: { sentAt: "asc" },
          select: {
            id: true,
            sender: true,
            content: true,
            type: true,
            mediaUrl: true,
            transcription: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    const exportedAt = new Date();
    const payload: WhatsAppBackupPayload = {
      format: "jd-whatsapp-backup",
      version: 1,
      exportedAt: exportedAt.toISOString(),
      owner,
      conversations: rows.map((conversation) => ({
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: conversation.messages.map((message) => ({
          ...message,
          sentAt: message.sentAt.toISOString(),
          deliveredAt: message.deliveredAt?.toISOString() ?? null,
          readAt: message.readAt?.toISOString() ?? null,
        })),
      })),
    };
    const messageCount = payload.conversations.reduce((total, conversation) => total + conversation.messages.length, 0);
    const fileName = whatsappBackupFileName(exportedAt, payload.conversations.length, messageCount);
    const path = `${owner.id}/${fileName}`;
    const encrypted = await encryptWhatsAppBackup(payload, body.password);
    await uploadWhatsAppBackup(path, encrypted);
    await prisma.accessLog.create({
      data: {
        userId: access.session.user.id,
        action: "whatsapp_backup_created",
        detail: JSON.stringify({ ownerId: owner.id, conversationCount: payload.conversations.length, messageCount, bytes: encrypted.byteLength }),
      },
    });
    return NextResponse.json({
      item: {
        path,
        name: fileName,
        size: encrypted.byteLength,
        createdAt: exportedAt.toISOString(),
        conversationCount: payload.conversations.length,
        messageCount,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Use uma senha de backup com pelo menos 10 caracteres." }, { status: 400 });
    if (error instanceof Error && /Selecione|não encontrado/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error, "Não foi possível criar o backup criptografado.");
  }
}

export async function DELETE(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const owner = await resolveOwner(
      { id: access.session.user.id, role: access.session.user.role },
      params.get("ownerId"),
    );
    const path = authorizedPath(owner.id, params.get("path") ?? "");
    await deleteWhatsAppBackup(path);
    await prisma.accessLog.create({
      data: {
        userId: access.session.user.id,
        action: "whatsapp_backup_deleted",
        detail: JSON.stringify({ ownerId: owner.id, fileName: path.split("/").at(-1) }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /Selecione|não encontrado|inválido/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error, "Não foi possível excluir o backup.");
  }
}
