import type { MessageSender, MessageType } from "@prisma/client";
import type { UazapiRecord } from "@/services/uazapi";

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function contentRecord(message: UazapiRecord) {
  if (typeof message.content === "object" && message.content) return message.content as UazapiRecord;
  if (typeof message.content !== "string") return {};
  try {
    const parsed = JSON.parse(message.content) as unknown;
    return typeof parsed === "object" && parsed ? parsed as UazapiRecord : {};
  } catch {
    return {};
  }
}

export function uazapiPhone(chat: UazapiRecord | undefined, chatId: string) {
  const direct = stringValue(chat?.phone);
  if (direct) return direct.replace(/\D/g, "");
  if (chatId.endsWith("@s.whatsapp.net")) return chatId.slice(0, -"@s.whatsapp.net".length).replace(/\D/g, "");
  return "";
}

export function uazapiMessageDate(value: unknown) {
  const timestamp = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date();
  return new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp);
}

export function uazapiMessageType(value: unknown): MessageType {
  const type = String(value ?? "").toLowerCase();
  if (type.includes("audio")) return "AUDIO";
  if (type.includes("image") || type.includes("sticker")) return "IMAGE";
  if (type.includes("video") || type.includes("ptv")) return "VIDEO";
  if (type.includes("document")) return "DOCUMENT";
  return "TEXT";
}

export function uazapiMessageSender(message: UazapiRecord): MessageSender {
  return message.fromMe === true ? "CORRETOR" : "LEAD";
}

export function uazapiMessageContent(message: UazapiRecord) {
  const content = contentRecord(message);
  const direct = stringValue(message.text)
    ?? stringValue(content.text)
    ?? stringValue(content.caption)
    ?? stringValue(content.title)
    ?? stringValue(content.displayName);
  if (direct) return direct;
  const type = uazapiMessageType(message.messageType);
  if (type === "AUDIO") return "[áudio]";
  if (type === "IMAGE") return "[imagem]";
  if (type === "VIDEO") return "[vídeo]";
  if (type === "DOCUMENT") return "[arquivo]";
  if (String(message.messageType ?? "").toLowerCase() === "call") return "[chamada]";
  return "[mensagem do WhatsApp]";
}

export function uazapiMediaUrl(message: UazapiRecord, leadId: string) {
  if (uazapiMessageType(message.messageType) === "TEXT") return null;
  const externalId = stringValue(message.messageid) ?? stringValue(message.id);
  if (!externalId) return null;
  const query = new URLSearchParams({ messageId: externalId, leadId });
  return `/api/uazapi/media?${query.toString()}`;
}

export function uazapiChatName(chat: UazapiRecord | undefined, message: UazapiRecord, phone: string) {
  return stringValue(chat?.lead_fullName)
    ?? stringValue(chat?.lead_name)
    ?? stringValue(chat?.wa_contactName)
    ?? stringValue(chat?.name)
    ?? stringValue(chat?.wa_name)
    ?? stringValue(message.senderName)
    ?? `WhatsApp ${phone.slice(-4)}`;
}

export function uazapiChatAvatar(record: UazapiRecord | undefined) {
  const url = stringValue(record?.image)
    ?? stringValue(record?.imagePreview)
    ?? stringValue(record?.profilePicUrl)
    ?? stringValue(record?.wa_profilePicUrl)
    ?? stringValue(record?.photo);
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

export function uazapiExternalId(message: UazapiRecord) {
  return stringValue(message.messageid) ?? stringValue(message.id);
}

export function uazapiFingerprint(sender: MessageSender, content: string, sentAt: Date) {
  return `${sender}|${content}|${Math.floor(sentAt.getTime() / 60_000)}`;
}

export function shouldUseAutomaticPreAttendance(fromMe: boolean, previousCount: number, enabled = true) {
  return enabled && !fromMe && previousCount === 0;
}
