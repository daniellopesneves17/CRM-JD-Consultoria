import { gunzipSync, gzipSync } from "node:zlib";

export const WHATSAPP_BACKUP_FORMAT = "jd-whatsapp-backup";
export const WHATSAPP_BACKUP_VERSION = 1;
export const WHATSAPP_BACKUP_MIN_PASSWORD_LENGTH = 10;
const PBKDF2_ITERATIONS = 210_000;

export type WhatsAppBackupMessage = {
  id: string;
  sender: "LEAD" | "BOT" | "CORRETOR";
  content: string;
  type: "TEXT" | "AUDIO" | "IMAGE" | "VIDEO" | "DOCUMENT";
  mediaUrl: string | null;
  transcription: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

export type WhatsAppBackupConversation = {
  id: string;
  status: "BOT" | "HUMANO" | "ENCERRADO";
  sentiment: "POSITIVO" | "NEUTRO" | "FRUSTRADO" | "URGENTE";
  isUrgent: boolean;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
  };
  messages: WhatsAppBackupMessage[];
};

export type WhatsAppBackupPayload = {
  format: typeof WHATSAPP_BACKUP_FORMAT;
  version: typeof WHATSAPP_BACKUP_VERSION;
  exportedAt: string;
  owner: { id: string; name: string };
  conversations: WhatsAppBackupConversation[];
};

type BackupEnvelope = {
  format: typeof WHATSAPP_BACKUP_FORMAT;
  version: typeof WHATSAPP_BACKUP_VERSION;
  encryption: "AES-256-GCM";
  keyDerivation: "PBKDF2-SHA-256";
  iterations: number;
  compression: "gzip";
  createdAt: string;
  conversationCount: number;
  messageCount: number;
  salt: string;
  iv: string;
  data: string;
};

function bytesToBase64(value: Uint8Array) {
  return Buffer.from(value).toString("base64");
}

function base64ToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function validatePassword(password: string) {
  if (password.length < WHATSAPP_BACKUP_MIN_PASSWORD_LENGTH || password.length > 128) {
    throw new Error(`A senha do backup deve ter entre ${WHATSAPP_BACKUP_MIN_PASSWORD_LENGTH} e 128 caracteres.`);
  }
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number, usage: KeyUsage[]) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt).buffer, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

export async function encryptWhatsAppBackup(payload: WhatsAppBackupPayload, password: string) {
  validatePassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS, ["encrypt"]);
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 9 });
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: Uint8Array.from(iv).buffer },
    key,
    Uint8Array.from(compressed).buffer,
  );
  const messageCount = payload.conversations.reduce((total, conversation) => total + conversation.messages.length, 0);
  const envelope: BackupEnvelope = {
    format: WHATSAPP_BACKUP_FORMAT,
    version: WHATSAPP_BACKUP_VERSION,
    encryption: "AES-256-GCM",
    keyDerivation: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    compression: "gzip",
    createdAt: payload.exportedAt,
    conversationCount: payload.conversations.length,
    messageCount,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };
  return Buffer.from(JSON.stringify(envelope), "utf8");
}

export async function decryptWhatsAppBackup(file: Uint8Array, password: string) {
  validatePassword(password);
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(Buffer.from(file).toString("utf8")) as BackupEnvelope;
  } catch {
    throw new Error("Arquivo de backup inválido ou corrompido.");
  }
  if (
    envelope.format !== WHATSAPP_BACKUP_FORMAT
    || envelope.version !== WHATSAPP_BACKUP_VERSION
    || envelope.encryption !== "AES-256-GCM"
    || envelope.keyDerivation !== "PBKDF2-SHA-256"
    || envelope.compression !== "gzip"
    || !Number.isInteger(envelope.iterations)
    || envelope.iterations < 100_000
    || typeof envelope.salt !== "string"
    || typeof envelope.iv !== "string"
    || typeof envelope.data !== "string"
  ) {
    throw new Error("Formato de backup não reconhecido.");
  }
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(password, salt, envelope.iterations, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Uint8Array.from(iv).buffer },
      key,
      Uint8Array.from(base64ToBytes(envelope.data)).buffer,
    );
    const payload = JSON.parse(gunzipSync(Buffer.from(decrypted)).toString("utf8")) as WhatsAppBackupPayload;
    if (payload.format !== WHATSAPP_BACKUP_FORMAT || payload.version !== WHATSAPP_BACKUP_VERSION || !Array.isArray(payload.conversations)) {
      throw new Error("Conteúdo incompatível.");
    }
    return payload;
  } catch {
    throw new Error("Senha incorreta ou backup corrompido.");
  }
}

export function whatsappBackupFileName(createdAt: Date, conversationCount: number, messageCount: number) {
  const stamp = createdAt.toISOString().replace(/[:.]/g, "-");
  return `${stamp}__${conversationCount}__${messageCount}.jdbackup`;
}

export function parseWhatsAppBackupFileName(name: string) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)__(\d+)__(\d+)\.jdbackup$/.exec(name);
  if (!match) return null;
  const createdAt = match[1].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z");
  return {
    createdAt,
    conversationCount: Number.parseInt(match[2], 10),
    messageCount: Number.parseInt(match[3], 10),
  };
}

export function backupConversationPreview(conversation: WhatsAppBackupConversation) {
  const last = conversation.messages.at(-1);
  if (!last) return "Sem mensagens";
  if (last.type === "AUDIO") return "Áudio";
  if (last.type === "IMAGE") return "Imagem";
  if (last.type === "VIDEO") return "Vídeo";
  if (last.type === "DOCUMENT") return "Documento";
  return last.content.replace(/[\r\n]+/g, " ").slice(0, 120) || "Mensagem";
}
