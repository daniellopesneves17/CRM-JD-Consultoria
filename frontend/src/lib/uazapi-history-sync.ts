import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  uazapiChatAvatar,
  uazapiChatName,
  uazapiContactName,
  uazapiContactPhone,
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
import { findUazapiChats, findUazapiContacts, findUazapiMessages, resolveUazapiConfig, type UazapiRecord } from "@/services/uazapi";

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
  includeDirectory?: boolean;
  directoryMaxPages?: number;
  maxPages?: number;
  pageSize?: number;
  since?: Date;
};

type DirectoryEntry = {
  phone: string;
  name: string;
  avatarUrl?: string;
  chatId: string;
  lastActivityAt?: Date;
};

const FALLBACK_NAME = /^WhatsApp \d{4}$/;

function chatDirectoryEntry(chat: UazapiRecord): DirectoryEntry | null {
  const chatId = typeof chat.wa_chatid === "string" ? chat.wa_chatid : typeof chat.wa_chatlid === "string" ? chat.wa_chatlid : "";
  if (!chatId || chat.wa_isGroup === true || chatId.includes("@g.us") || chatId.includes("@newsletter")) return null;
  const phone = uazapiPhone(chat, chatId);
  if (phone.length < 10) return null;
  const timestamp = Number(chat.wa_lastMsgTimestamp);
  return {
    phone,
    name: uazapiChatName(chat, {}, phone),
    avatarUrl: uazapiChatAvatar(chat),
    chatId: chatId.endsWith("@lid") ? `${phone}@s.whatsapp.net` : chatId,
    lastActivityAt: Number.isFinite(timestamp) && timestamp > 0 ? uazapiMessageDate(timestamp) : undefined,
  };
}

function contactDirectoryEntry(contact: UazapiRecord): DirectoryEntry | null {
  const phone = uazapiContactPhone(contact);
  if (phone.length < 10) return null;
  return { phone, name: uazapiContactName(contact, phone), chatId: `${phone}@s.whatsapp.net` };
}

async function upsertDirectoryBatch(ownerId: string, entries: DirectoryEntry[]) {
  const unique = [...new Map(entries.map((entry) => [entry.phone, entry])).values()];
  if (!unique.length) return { contacts: 0, created: 0, conversations: 0 };

  const before = await prisma.lead.findMany({
    where: { userId: ownerId, phone: { in: unique.map((entry) => entry.phone) } },
    select: { id: true, phone: true, name: true },
  });
  const existingPhones = new Set(before.map((lead) => lead.phone));
  const missingLeads = unique.filter((entry) => !existingPhones.has(entry.phone)).map((entry) => ({
      name: entry.name,
      phone: entry.phone,
      avatarUrl: entry.avatarUrl,
      source: "WHATSAPP" as const,
      stage: "NOVO" as const,
      userId: ownerId,
      lastActivityAt: entry.lastActivityAt,
    }));
  if (missingLeads.length) await prisma.lead.createMany({ data: missingLeads, skipDuplicates: true });

  const values = unique.map((entry) => Prisma.sql`(${entry.phone}, ${entry.name}, ${entry.avatarUrl ?? null}, ${entry.lastActivityAt?.toISOString() ?? null})`);
  await prisma.$executeRaw(Prisma.sql`
    update crm."Lead" as lead
       set "name" = case when lead."name" ~ ${FALLBACK_NAME.source} then data.name else lead."name" end,
           "avatarUrl" = coalesce(data.avatar_url, lead."avatarUrl"),
           "lastActivityAt" = case
             when data.last_activity_at is null then lead."lastActivityAt"
             when lead."lastActivityAt" is null then data.last_activity_at::timestamptz
             else greatest(lead."lastActivityAt", data.last_activity_at::timestamptz)
           end,
           "updatedAt" = current_timestamp
      from (values ${Prisma.join(values)}) as data(phone, name, avatar_url, last_activity_at)
     where lead."userId" = ${ownerId}
       and lead."phone" = data.phone
  `);

  const leads = await prisma.lead.findMany({
    where: { userId: ownerId, phone: { in: unique.map((entry) => entry.phone) } },
    select: { id: true, phone: true },
  });
  const leadByPhone = new Map(leads.map((lead) => [lead.phone, lead]));
  const conversations = await prisma.conversation.findMany({
    where: { leadId: { in: leads.map((lead) => lead.id) }, status: { not: "ENCERRADO" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, leadId: true },
  });
  const conversationByLead = new Map<string, string>();
  for (const conversation of conversations) if (!conversationByLead.has(conversation.leadId)) conversationByLead.set(conversation.leadId, conversation.id);
  const missing = unique.flatMap((entry) => {
    const lead = leadByPhone.get(entry.phone);
    if (!lead || conversationByLead.has(lead.id)) return [];
    return [{ leadId: lead.id, uazapiChatId: entry.chatId, status: "HUMANO" as const, updatedAt: entry.lastActivityAt ?? new Date(0) }];
  });
  if (missing.length) await prisma.conversation.createMany({ data: missing });

  const conversationUpdates = unique.flatMap((entry) => {
    const lead = leadByPhone.get(entry.phone);
    const conversationId = lead ? conversationByLead.get(lead.id) : undefined;
    if (!conversationId) return [];
    return [Prisma.sql`(${conversationId}, ${entry.chatId}, ${entry.lastActivityAt?.toISOString() ?? null})`];
  });
  if (conversationUpdates.length) {
    await prisma.$executeRaw(Prisma.sql`
      update crm."Conversation" as conversation
         set "uazapiChatId" = coalesce(data.chat_id, conversation."uazapiChatId"),
             "updatedAt" = case
               when data.last_activity_at is null then conversation."updatedAt"
               else greatest(conversation."updatedAt", data.last_activity_at::timestamptz)
             end
        from (values ${Prisma.join(conversationUpdates)}) as data(id, chat_id, last_activity_at)
       where conversation.id = data.id
    `);
  }
  return { contacts: unique.length, created: missingLeads.length, conversations: missing.length };
}

export async function syncUazapiDirectory(owner: UazapiSyncOwner, options: { pageSize?: number; maxPages?: number } = {}) {
  if (!owner.active || !owner.crmEnabled) throw new Error(`CRM de ${owner.name} está desabilitado.`);
  const config = resolveUazapiConfig(owner);
  if (!config) throw new Error(`Nenhuma conexão de WhatsApp está configurada para ${owner.name}.`);
  const pageSize = Math.min(1000, Math.max(50, options.pageSize ?? 1000));
  const maxPages = Math.min(100, Math.max(1, options.maxPages ?? 50));
  const directory = new Map<string, DirectoryEntry>();
  let contactOffset = 0;
  let chatOffset = 0;
  let contactPages = 0;
  let chatPages = 0;
  let contactTotal: number | undefined;
  let chatTotal: number | undefined;
  let contactsTruncated = false;
  let chatsTruncated = false;

  for (; contactPages < maxPages; contactPages += 1) {
    const page = await findUazapiContacts(contactOffset, pageSize, config);
    contactTotal = page.totalRecords ?? contactTotal;
    for (const contact of page.contacts) {
      const entry = contactDirectoryEntry(contact);
      if (entry) directory.set(entry.phone, entry);
    }
    if (!page.hasMore || !page.contacts.length) { contactPages += 1; break; }
    contactOffset = page.nextOffset;
    if (contactPages === maxPages - 1) contactsTruncated = true;
  }

  for (; chatPages < maxPages; chatPages += 1) {
    const page = await findUazapiChats(chatOffset, pageSize, config);
    chatTotal = page.totalRecords ?? chatTotal;
    for (const chat of page.chats) {
      const entry = chatDirectoryEntry(chat);
      if (!entry) continue;
      const current = directory.get(entry.phone);
      directory.set(entry.phone, {
        ...current,
        ...entry,
        name: FALLBACK_NAME.test(entry.name) && current ? current.name : entry.name,
        avatarUrl: entry.avatarUrl ?? current?.avatarUrl,
      });
    }
    if (!page.hasMore || !page.chats.length) { chatPages += 1; break; }
    chatOffset = page.nextOffset;
    if (chatPages === maxPages - 1) chatsTruncated = true;
  }

  const entries = [...directory.values()];
  const totals = { contacts: 0, created: 0, conversations: 0 };
  for (let index = 0; index < entries.length; index += 1000) {
    const result = await upsertDirectoryBatch(owner.id, entries.slice(index, index + 1000));
    totals.contacts += result.contacts;
    totals.created += result.created;
    totals.conversations += result.conversations;
  }
  return { ownerId: owner.id, contactPages, chatPages, contactTotal, chatTotal, contactsTruncated, chatsTruncated, ...totals };
}

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
    where: { userId_phone: { userId: ownerId, phone } },
    update: { ...(FALLBACK_NAME.test(displayName) ? {} : { name: displayName }), ...(avatarUrl ? { avatarUrl } : {}) },
    create: { name: displayName, phone, source: "WHATSAPP", stage: "NOVO", userId: ownerId, lastActivityAt, avatarUrl },
  });
  if (!lead.lastActivityAt || lead.lastActivityAt < lastActivityAt) {
    await prisma.lead.update({ where: { id: lead.id }, data: { lastActivityAt } });
  }

  let conversation = await prisma.conversation.findFirst({ where: { uazapiChatId: chatId, lead: { userId: ownerId } } });
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

  const directory = options.includeDirectory === false
    ? null
    : await syncUazapiDirectory(owner, { pageSize: options.pageSize, maxPages: options.directoryMaxPages });

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
    const batch = await Promise.all(entries.slice(index, index + 4).map(([chatId, items]) => syncChat(owner.id, chatId, undefined, items)));
    for (const result of batch) {
      totals.chats += result.chats;
      totals.imported += result.imported;
      totals.skipped += result.skipped;
    }
  }

  return { ownerId: owner.id, fetched: relevantMessages.length, pages: pagesFetched, directory, ...totals };
}
