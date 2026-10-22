import type { UazapiRecord } from "@/services/uazapi";

export type WhatsAppStatusItem = {
  id: string;
  author: string;
  authorId: string;
  authorImage: string | null;
  text: string;
  type: "text" | "image" | "video" | "audio" | "unavailable" | "other";
  thumbnail: string | null;
  createdAt: string;
  fromMe: boolean;
  hasMedia: boolean;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function contentRecord(value: unknown): UazapiRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as UazapiRecord;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as UazapiRecord : {};
  } catch {
    return {};
  }
}

function statusType(value: unknown): WhatsAppStatusItem["type"] {
  const type = stringValue(value).toLowerCase();
  if (type === "error") return "unavailable";
  if (type.includes("image")) return "image";
  if (type.includes("video")) return "video";
  if (type.includes("audio") || type.includes("ptt")) return "audio";
  if (type.includes("text") || type.includes("conversation") || type.includes("extended")) return "text";
  return "other";
}

function safeImage(value: unknown) {
  const source = stringValue(value);
  if (/^https:\/\//i.test(source) || /^data:image\//i.test(source)) return source;
  if (/^[A-Za-z0-9+/=]+$/.test(source) && source.length > 80 && source.length < 1_400_000) {
    return `data:image/jpeg;base64,${source}`;
  }
  return null;
}

export function normalizeUazapiStatus(record: UazapiRecord): WhatsAppStatusItem | null {
  const id = stringValue(record.id) || stringValue(record.messageid);
  if (!id) return null;
  const content = contentRecord(record.content);
  const type = statusType(record.messageType);
  const timestamp = typeof record.messageTimestamp === "number" ? record.messageTimestamp : Number(record.messageTimestamp);
  const millis = Number.isFinite(timestamp) && timestamp > 0 ? (timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp) : Date.now();
  const authorId = stringValue(record.sender_pn) || stringValue(record.sender_lid) || stringValue(record.sender);
  const text = stringValue(record.text)
    || stringValue(content.text)
    || stringValue(content.caption)
    || stringValue(content.conversation);
  return {
    id,
    author: stringValue(record.senderName) || authorId.replace(/@.+$/, "") || "Contato",
    authorId,
    authorImage: safeImage(record.sender_image_preview_url),
    text,
    type,
    thumbnail: safeImage(content.JPEGThumbnail) || safeImage(content.jpegThumbnail),
    createdAt: new Date(millis).toISOString(),
    fromMe: record.fromMe === true,
    hasMedia: type === "image" || type === "video" || type === "audio",
  };
}
