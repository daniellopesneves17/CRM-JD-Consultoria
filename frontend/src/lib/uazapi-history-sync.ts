import { prisma } from "@/lib/prisma";
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
  uazapiPageReachedCutoff,
  uazapiPhone,
} from "@/lib/uazapi-sync";
import { findUazapiChats, findUazapiMessages, resolveUazapiConfig, type UazapiRecord } from "@/services/uazapi";

export type UazapiSyncOwner = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  crmEnabled: boolean;
  uazapiBaseUrl: string | null;
  uazapiToken: string | null;
};

export type UazapiHistorySyncOptions = {
  includeChats?: boolean;
  maxPages?: number;
  pageSize?: number;
  since?: Date;
};

function activityExternalId(detail: string) {
  try {
    const parsed = JSON.parse(detail) as { externalId?: unknown };
    return typeof parsed.externalId === "string" ? parsed.externalId : undefined;
  } catch {
    return undefined;
  }
}

async function syncChat(ownerId: string, chatId: string, chat: UazapiRecord | undefined, messages: UazapiRecord[]) {
  const phone = uazapiPhone(chat, chatId);
  if (phone.length < 10) return { chats: 0, imported: 0, skipped: messages.length };

  const sorted = messages
    .filter((message) => message.isGroup !== true && String(message.messageType ?? message.type ?? "").toLowerCase() !== "call")
    .sort((left, right) => uazapiMessageDate(left.messageTimestamp).getTime() - uazapiMessageDate(right.messageTimestamp).getTime());
  if (!sorted.length) return { chats: 0, imported: 0, skipped: messages.length };

  const firstActivityAt = new Date(uazapiMessageDate(sorted[0]?.messageTimestamp).getTime() - 60_000);
  const lastActivityAt = uazapiMessageDate(sorted.at(-1)?.messageTimestamp);
  const avatarUrl = uazapiChatAvatar(chat);
  const displayName = uazapiChatName(chat, sorted.at(-1) ?? {}, phone);
  const lead = await prisma.lead.upsert({
    where: { phone },
    update: { name: displayName, userId: ownerId, ...(avatarUrl ? { avatarUrl } : {}) },
    create: { name: displayName, phone, source: "WHATSAPP", stage: "NOVO", userId: ownerId, lastActivityAt, avatarUrl },
  });
  if (!lead.lastActivityAt || lead.lastActivityAt < lastActivityAt) {
    await prisma.lead.update({ where: { id: lead.id }, data: { lastActivityAt } });
  }

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
    prisma.activity.findMany({
      where: { leadId: lead.id, type: "uazapi_message", createdAt: { gte: firstActivityAt } },
      select: { detail: true },
    }),
    prisma.message.findMany({
      where: { conversationId: conversation.id, sentAt: { gte: firstActivityAt } },
      select: { sender: true, content: true, sentAt: true },
    }),
  ]);
  const knownExternalIds = new Set(activities.map((item) => activityExternalId(item.detail)).filter(Boolean));
  const knownFingerprints = new Set(existingMessages.map((item) => uazapiFingerprint(item.sender, item.content, item.sentAt)));
  const conversationActivityAt = existingMessages.reduce(
    (latest, message) => message.sentAt > latest ? message.sentAt : latest,
    lastActivityAt,
  );
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
      prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: conversationActivityAt } }),
    ]);
  } else if (conversation.updatedAt < conversationActivityAt) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: conversationActivityAt } });
  }
  return { chats: 1, imported: fresh.length, skipped: sorted.length - fresh.length };
}

export async function syncUazapiHistory(owner: UazapiSyncOwner, options: UazapiHistorySyncOptions = {}) {
  if (!owner.active || !owner.crmEnabled) throw new Error(`CRM de ${owner.name} está desabilitado.`);
  const config = resolveUazapiConfig(owner);
  if (!config) throw new Error(`Nenhuma conexão de WhatsApp está configurada para ${owner.name}.`);

  const chats = options.includeChats === false ? [] : await findUazapiChats(config);
  const chatsById = new Map<string, UazapiRecord>();
  for (const chat of chats) {
    for (const id of [chat.wa_chatid, chat.wa_chatlid]) if (typeof id === "string" && id) chatsById.set(id, chat);
  }

  const messages: UazapiRecord[] = [];
  const pageSize = Math.min(1000, Math.max(1, options.pageSize ?? 1000));
  const maxPages = Math.min(10, Math.max(1, options.maxPages ?? 10));
  let offset = 0;
  let pagesFetched = 0;
  for (; pagesFetched < maxPages; pagesFetched += 1) {
    const result = await findUazapiMessages(offset, pageSize, config);
    messages.push(...result.messages);
    const reachedCutoff = uazapiPageReachedCutoff(result.messages, options.since);
    if (!result.hasMore || !result.messages.length || reachedCutoff) {
      pagesFetched += 1;
      break;
    }
    offset = result.nextOffset;
  }

  const relevantMessages = options.since
    ? messages.filter((message) => uazapiMessageDate(message.messageTimestamp) >= options.since!)
    : messages;
  const groups = new Map<string, UazapiRecord[]>();
  for (const message of relevantMessages) {
    const chatId = typeof message.chatid === "string" ? message.chatid : "";
    if (!chatId || message.isGroup === true || chatId.includes("@g.us") || chatId.includes("@newsletter")) continue;
    const group = groups.get(chatId) ?? [];
    group.push(message);
    groups.set(chatId, group);
  }

  const totals = { chats: 0, imported: 0, skipped: 0 };
  const entries = [...groups.entries()];
  for (let index = 0; index < entries.length; index += 4) {
    const batch = await Promise.all(entries.slice(index, index + 4).map(([chatId, items]) => syncChat(owner.id, chatId, chatsById.get(chatId), items)));
    for (const result of batch) {
      totals.chats += result.chats;
      totals.imported += result.imported;
      totals.skipped += result.skipped;
    }
  }

  return { ownerId: owner.id, fetched: relevantMessages.length, pages: pagesFetched, ...totals };
}
