// Cliente da Uazapi v2 para presença, texto e mídia. Token permanece somente no servidor.
const baseUrl = () => {
  const value = process.env.UAZAPI_BASE_URL?.replace(/\/$/, "");
  if (!value) throw new Error("UAZAPI_BASE_URL não configurada.");
  return value;
};

async function request(path: string, body: Record<string, unknown>) {
  if (!process.env.UAZAPI_TOKEN) throw new Error("UAZAPI_TOKEN não configurado.");
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Token: process.env.UAZAPI_TOKEN },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Uazapi indisponível (${response.status}).`);
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function humanDelay() {
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
}

export async function setTyping(phone: string) {
  await request("/send/presence", { number: normalizePhone(phone), presence: "composing", delay: 3000 });
}

export async function sendText(phone: string, text: string) {
  await setTyping(phone).catch(() => undefined);
  await humanDelay();
  return request("/send/text", { number: normalizePhone(phone), text, linkPreview: false, readchat: true, delay: 0 });
}

export async function sendDocument(phone: string, fileUrl: string, fileName: string, caption = "") {
  await setTyping(phone).catch(() => undefined);
  await humanDelay();
  return request("/send/media", { number: normalizePhone(phone), type: "document", file: fileUrl, docName: fileName, text: caption, readchat: true, delay: 0 });
}

export function sendAudio(phone: string, audioUrl: string) {
  return request("/send/media", { number: normalizePhone(phone), type: "audio", file: audioUrl, text: "", readchat: true, delay: 0 });
}

export async function getProfilePicture(phone: string): Promise<string | null> {
  const result = await request("/chat/details", { number: normalizePhone(phone), preview: true });
  return typeof result.image === "string" ? result.image : null;
}

export async function getUazapiStatus(signal?: AbortSignal) {
  if (!process.env.UAZAPI_TOKEN) throw new Error("UAZAPI_TOKEN não configurado.");
  let lastError: Error | null = null;
  for (const path of ["/instance/status", "/instance/connectionState"]) {
    try {
      const response = await fetch(`${baseUrl()}${path}`, { headers: { Token: process.env.UAZAPI_TOKEN }, signal, cache: "no-store" });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha desconhecida");
    }
  }
  throw lastError ?? new Error("Uazapi indisponível.");
}

