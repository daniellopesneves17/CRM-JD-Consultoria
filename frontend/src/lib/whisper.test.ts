import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTranscriptionAudioSize,
  MAX_TRANSCRIPTION_AUDIO_BYTES,
  transcriptionFileMetadata,
} from "@/services/whisper";

test("preserva o contêiner OGG usado nos áudios do WhatsApp", () => {
  assert.deepEqual(
    transcriptionFileMetadata("audio/ogg; codecs=opus", "https://example.com/media"),
    { filename: "whatsapp-audio.ogg", type: "audio/ogg" },
  );
});

test("usa a extensão da URL quando o servidor retorna tipo genérico", () => {
  assert.deepEqual(
    transcriptionFileMetadata("application/octet-stream", "https://example.com/audio/voice.m4a?token=secret"),
    { filename: "whatsapp-audio.m4a", type: "audio/m4a" },
  );
});

test("aceita áudio com até 20 MB e rejeita o excedente", () => {
  assert.doesNotThrow(() => assertTranscriptionAudioSize(MAX_TRANSCRIPTION_AUDIO_BYTES));
  assert.throws(
    () => assertTranscriptionAudioSize(MAX_TRANSCRIPTION_AUDIO_BYTES + 1),
    /excede o limite de 20 MB/,
  );
});
