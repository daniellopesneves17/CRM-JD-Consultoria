// Cliente da Uazapi v2 para presença, texto e mídia. Token permanece somente no servidor.
export type UazapiConfig = { baseUrl: string; token: string };

export function resolveUazapiConfig(user?: { email?: string | null; uazapiBaseUrl?: string | null; uazapiToken?: string | null }): UazapiConfig | undefined {
  if (user?.uazapiBaseUrl && user.uazapiToken) return { baseUrl: user.uazapiBaseUrl, token: user.uazapiToken };
  const ownerEmail = process.env.UAZAPI_OWNER_EMAIL?.trim().toLowerCase();
  if (!user?.email || !ownerEmail || user.email.trim().toLowerCase() !== ownerEmail) return undefined;
  try { return configFromEnv(); } catch { return undefined; }
}

const configFromEnv = (): UazapiConfig => {
  const value = process.env.UAZAPI_BASE_URL?.replace(/\/$/, "");
  if (!value) throw new Error("UAZAPI_BASE_URL não configurada.");
  if (!process.env.UAZAPI_TOKEN) throw new Error("UAZAPI_TOKEN não configurado.");
  return { baseUrl: value, token: process.env.UAZAPI_TOKEN };
};

async function request(path: string, body: Record<string, unknown>, config?: UazapiConfig) {
  const resolved = config ?? configFromEnv();
  const response = await fetch(`${resolved.baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Token: resolved.token },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Uazapi indisponível (${response.status}).`);
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export type UazapiRecord = Record<string, unknown>;

function paginatedRecords(result: UazapiRecord, key: string, offset: number, limit: number) {
  const pagination = typeof result.pagination === "object" && result.pagination
    ? result.pagination as UazapiRecord
    : result;
  const records = Array.isArray(result[key]) ? result[key] as UazapiRecord[] : [];
  const totalRecords = typeof pagination.totalRecords === "number" ? pagination.totalRecords : undefined;
  const nextOffset = typeof pagination.nextOffset === "number" ? pagination.nextOffset : offset + records.length;
  return {
    records,
    hasMore: pagination.hasMore === true || (totalRecords != null && nextOffset < totalRecords),
    nextOffset,
    totalRecords,
    limit,
  };
}

export async function findUazapiChats(offset = 0, limit = 1000, config?: UazapiConfig) {
  const result = await request("/chat/find", {
    operator: "AND",
    sort: "-wa_lastMsgTimestamp",
    limit,
    offset,
    compact: false,
    wa_isGroup: false,
  }, config);
  const page = paginatedRecords(result, "chats", offset, limit);
  return { chats: page.records, ...page };
}

export async function findUazapiContacts(offset = 0, limit = 1000, config?: UazapiConfig) {
  const result = await request("/contacts/list", { limit, offset }, config);
  const page = paginatedRecords(result, "contacts", offset, limit);
  return { contacts: page.records, ...page };
}

export async function findUazapiMessages(offset = 0, limit = 1000, config?: UazapiConfig) {
  const result = await request("/message/find", { offset, limit }, config);
  const page = paginatedRecords(result, "messages", offset, limit);
  return {
    messages: page.records,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
  };
}

export async function downloadUazapiMessage(id: string, config?: UazapiConfig) {
  return request("/message/download", { id, return_link: true, return_base64: false, generate_mp3: true }, config);
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function humanDelay() {
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
}

export async function setTyping(phone: string, config?: UazapiConfig) {
  await request("/message/presence", { number: normalizePhone(phone), presence: "composing", delay: 3000 }, config);
}

export async function sendText(phone: string, text: string, config?: UazapiConfig) {
  await setTyping(phone, config).catch(() => undefined);
  await humanDelay();
  return request("/send/text", { number: normalizePhone(phone), text, linkPreview: false, readchat: true, delay: 0 }, config);
}

export async function sendDocument(phone: string, fileUrl: string, fileName: string, caption = "", config?: UazapiConfig) {
  await setTyping(phone, config).catch(() => undefined);
  await humanDelay();
  return request("/send/media", { number: normalizePhone(phone), type: "document", file: fileUrl, docName: fileName, text: caption, readchat: true, delay: 0 }, config);
}

export function sendAudio(phone: string, audioUrl: string, config?: UazapiConfig) {
  return request("/send/media", { number: normalizePhone(phone), type: "audio", file: audioUrl, text: "", readchat: true, delay: 0 }, config);
}

export async function getProfilePicture(phone: string, config?: UazapiConfig): Promise<string | null> {
  const result = await request("/chat/details", { number: normalizePhone(phone), preview: true }, config);
  return typeof result.image === "string" ? result.image : null;
}

export async function getUazapiStatus(signal?: AbortSignal) {
  const config = configFromEnv();
  let lastError: Error | null = null;
  for (const path of ["/instance/status", "/instance/connectionState"]) {
    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, { headers: { Token: config.token }, signal, cache: "no-store" });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha desconhecida");
    }
  }
  throw lastError ?? new Error("Uazapi indisponível.");
}

