import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import {
  uazapiChatAvatar,
  uazapiChatName,
  uazapiExternalId,
  uazapiFingerprint,
  uazapiMediaUrl,
  uazapiMessageContent,
  uazapiMessageDate,
  uazapiMessageSender,
  uazapiMessageType,
  uazapiPhone,
} from "@/lib/uazapi-sync";
import { findUazapiChats, findUazapiMessages, type UazapiConfig, type UazapiRecord } from "@/services/uazapi";

export const maxDuration = 60;

function activityExternalId(detail: string) {
  try {
    const parsed = JSON.parse(detail) as { externalId?: unknown };
    return typeof parsed.externalId === "string" ? parsed.externalId : undefined;
  } catch {
    return undefined;
  }
}

async function syncChat(ownerId: string, chatId: string, chat: UazapiRecord | undefined, messages: UazapiRecord[], config?: UazapiConfig) {
  const phone = uazapiPhone(chat, chatId);
  if (phone.length < 10) return { chats: 0, imported: 0, skipped: messages.length };

  const sorted = messages
    .filter((message) => message.isGroup !== true && String(message.messageType ?? message.type ?? "").toLowerCase() !== "call")
    .sort((left, right) => uazapiMessageDate(left.messageTimestamp).getTime() - uazapiMessageDate(right.messageTimestamp).getTime());
  if (!sorted.length) return { chats: 0, imported: 0, skipped: messages.length };

  const lastActivityAt = uazapiMessageDate(sorted.at(-1)?.messageTimestamp);
  const avatarUrl = uazapiChatAvatar(chat);
  const displayName = uazapiChatName(chat, sorted.at(-1) ?? {}, phone);
  const lead = await prisma.lead.upsert({
    where: { phone },
    update: { name: displayName, userId: ownerId, lastActivityAt, ...(avatarUrl ? { avatarUrl } : {}) },
    create: {
      name: uazapiChatName(chat, sorted.at(-1) ?? {}, phone),
      phone,
      source: "WHATSAPP",
      stage: "NOVO",
      userId: ownerId,
      lastActivityAt,
      avatarUrl,
    },
  });

  let conversation = await prisma.conversation.findFirst({ where: { uazapiChatId: chatId } });
  if (!conversation) {
    conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, status: { not: "ENCERRADO" } },
      orderBy: { updatedAt: "desc" },
    });
  }
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { leadId: lead.id, uazapiChatId: chatId, status: "HUMANO" } });
  } else if (conversation.uazapiChatId !== chatId) {
    conversation = await prisma.conversation.update({ where: { id: conversation.id }, data: { uazapiChatId: chatId, status: "HUMANO" } });
  } else if (conversation.status === "BOT") {
    conversation = await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "HUMANO" } });
  }

  const [activities, existingMessages] = await Promise.all([
    prisma.activity.findMany({ where: { leadId: lead.id, type: "uazapi_message" }, select: { detail: true } }),
    prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: "desc" },
      take: 300,
      select: { sender: true, content: true, sentAt: true },
    }),
  ]);
  const knownExternalIds = new Set(activities.map((item) => activityExternalId(item.detail)).filter(Boolean));
  const knownFingerprints = new Set(existingMessages.map((item) => uazapiFingerprint(item.sender, item.content, item.sentAt)));
  const seenExternalIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const fresh = sorted.flatMap((message) => {
    const externalId = uazapiExternalId(message);
    const sender = uazapiMessageSender(message);
    const content = uazapiMessageContent(message);
    const sentAt = uazapiMessageDate(message.messageTimestamp);
    const fingerprint = uazapiFingerprint(sender, content, sentAt);
    if ((externalId && (knownExternalIds.has(externalId) || seenExternalIds.has(externalId))) || knownFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) return [];
    if (externalId) seenExternalIds.add(externalId);
    seenFingerprints.add(fingerprint);
    const status = String(message.status ?? "").toLowerCase();
    return [{ message, externalId, sender, content, sentAt, status }];
  });

  if (fresh.length) {
    await prisma.$transaction([
      prisma.message.createMany({
        data: fresh.map(({ message, sender, content, sentAt, status }) => ({
          conversationId: conversation.id,
          sender,
          content,
          type: uazapiMessageType(message.messageType),
          mediaUrl: uazapiMediaUrl(message, lead.id),
          userId: sender === "CORRETOR" ? ownerId : null,
          sentAt,
          deliveredAt: ["delivered", "read", "played"].includes(status) ? sentAt : null,
          readAt: ["read", "played"].includes(status) ? sentAt : null,
        })),
      }),
      prisma.activity.createMany({
        data: fresh.flatMap(({ externalId, sentAt }) => externalId ? [{
          leadId: lead.id,
          type: "uazapi_message",
          detail: JSON.stringify({ externalId, imported: true }),
          createdAt: sentAt,
        }] : []),
      }),
      prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: lastActivityAt } }),
    ]);
  }
  return { chats: 1, imported: fresh.length, skipped: sorted.length - fresh.length };
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() || (access.session.user.role === "ADMIN" ? null : access.session.user.id);
    if (!ownerId) return NextResponse.json({ error: "Selecione um CRM para sincronizar." }, { status: 400 });
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, email: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true } });
    if (!owner?.active || !owner.crmEnabled) return NextResponse.json({ error: "Responsável da Uazapi indisponível." }, { status: 503 });
    if (access.session.user.role !== "ADMIN" && access.session.user.id !== owner.id) {
      return NextResponse.json({ error: "Nenhuma conexão de WhatsApp está configurada para este perfil." }, { status: 403 });
    }
    const ownerEmail = process.env.UAZAPI_OWNER_EMAIL?.trim().toLowerCase();
    if (!owner.uazapiToken && owner.email.toLowerCase() !== ownerEmail) return NextResponse.json({ error: "Nenhuma conexão de WhatsApp está configurada para este perfil." }, { status: 403 });
    const config: UazapiConfig | undefined = owner.uazapiToken && owner.uazapiBaseUrl ? { baseUrl: owner.uazapiBaseUrl, token: owner.uazapiToken } : undefined;

    const chats = await findUazapiChats(config);
    const chatsById = new Map<string, UazapiRecord>();
    for (const chat of chats) {
      for (const id of [chat.wa_chatid, chat.wa_chatlid]) if (typeof id === "string" && id) chatsById.set(id, chat);
    }

    const messages: UazapiRecord[] = [];
    let offset = 0;
    for (let page = 0; page < 10; page += 1) {
      const result = await findUazapiMessages(offset, 1000, config);
      messages.push(...result.messages);
      if (!result.hasMore || !result.messages.length) break;
      offset = result.nextOffset;
    }

    const groups = new Map<string, UazapiRecord[]>();
    for (const message of messages) {
      const chatId = typeof message.chatid === "string" ? message.chatid : "";
      if (!chatId || message.isGroup === true || chatId.includes("@g.us") || chatId.includes("@newsletter")) continue;
      const group = groups.get(chatId) ?? [];
      group.push(message);
      groups.set(chatId, group);
    }

    const totals = { chats: 0, imported: 0, skipped: 0 };
    const entries = [...groups.entries()];
    for (let index = 0; index < entries.length; index += 4) {
      const batch = await Promise.all(entries.slice(index, index + 4).map(([chatId, items]) => syncChat(owner.id, chatId, chatsById.get(chatId), items, config)));
      for (const result of batch) {
        totals.chats += result.chats;
        totals.imported += result.imported;
        totals.skipped += result.skipped;
      }
    }

    return NextResponse.json({ ok: true, fetched: messages.length, ...totals });
  } catch (error) {
    return apiError(error, "Não foi possível sincronizar o histórico do WhatsApp.");
  }
}
