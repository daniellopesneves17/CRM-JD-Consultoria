// Transcrição server-side de áudios recebidos; nenhuma mídia é exposta ao navegador.
import { getOpenAI, getTranscriptionModel } from "./ai/client";

export const MAX_TRANSCRIPTION_AUDIO_BYTES = 20 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "ogg", "wav", "webm"]);
const MIME_EXTENSIONS: Record<string, string> = {
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function transcriptionFileMetadata(contentType: string | null, mediaUrl: string) {
  const mimeType = contentType?.split(";", 1)[0]?.trim().toLowerCase() || "application/octet-stream";
  let urlExtension = "";
  try {
    urlExtension = new URL(mediaUrl).pathname.split(".").pop()?.toLowerCase() ?? "";
  } catch {
    urlExtension = "";
  }
  if (urlExtension === "opus" || urlExtension === "oga") urlExtension = "ogg";
  const extension = MIME_EXTENSIONS[mimeType] ?? (SUPPORTED_EXTENSIONS.has(urlExtension) ? urlExtension : "ogg");
  const type = mimeType === "application/octet-stream" ? `audio/${extension === "mp3" ? "mpeg" : extension}` : mimeType;
  return { filename: `whatsapp-audio.${extension}`, type };
}

export function assertTranscriptionAudioSize(bytes: number) {
  if (bytes > MAX_TRANSCRIPTION_AUDIO_BYTES) throw new Error("O áudio excede o limite de 20 MB para transcrição.");
}

export async function transcribeAudio(mediaUrl: string) {
  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Não foi possível baixar o áudio recebido.");
  const announcedSize = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(announcedSize)) assertTranscriptionAudioSize(announcedSize);
  const audio = await response.arrayBuffer();
  assertTranscriptionAudioSize(audio.byteLength);
  const metadata = transcriptionFileMetadata(response.headers.get("content-type"), mediaUrl);
  const file = new File([audio], metadata.filename, { type: metadata.type });
  const transcription = await getOpenAI().audio.transcriptions.create({
    file,
    model: getTranscriptionModel(),
    language: "pt",
    response_format: "json",
  });
  const text = transcription.text.trim();
  if (!text) throw new Error("A transcrição não retornou conteúdo.");
  return text;
}

