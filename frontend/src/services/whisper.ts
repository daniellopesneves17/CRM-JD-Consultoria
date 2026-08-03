// Transcrição server-side de áudios recebidos; nenhuma mídia é exposta ao navegador.
import { getOpenAI } from "./ai/client";

export async function transcribeAudio(mediaUrl: string) {
  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Não foi possível baixar o áudio recebido.");
  const file = new File([await response.arrayBuffer()], "whatsapp-audio.ogg", { type: response.headers.get("content-type") ?? "audio/ogg" });
  const transcription = await getOpenAI().audio.transcriptions.create({ file, model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1", language: "pt" });
  return transcription.text;
}

