import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldUseAutomaticPreAttendance,
  uazapiChatAvatar,
  uazapiChatName,
  uazapiFingerprint,
  uazapiMediaUrl,
  uazapiMessageContent,
  uazapiMessageDate,
  uazapiMessageSender,
  uazapiMessageType,
  uazapiPhone,
} from "./uazapi-sync";

test("normaliza contato, nome e data do histórico da Uazapi", () => {
  const chat = { phone: "+55 (11) 99999-0000", wa_contactName: "Cliente Teste", imagePreview: "https://example.com/avatar.jpg" };
  assert.equal(uazapiPhone(chat, "5511999990000@s.whatsapp.net"), "5511999990000");
  assert.equal(uazapiChatName(chat, {}, "5511999990000"), "Cliente Teste");
  assert.equal(uazapiChatAvatar(chat), "https://example.com/avatar.jpg");
  assert.equal(uazapiMessageDate(1_790_000_000_000).getTime(), 1_790_000_000_000);
});

test("diferencia vídeo de documento", () => {
  assert.equal(uazapiMessageType("VideoMessage"), "VIDEO");
  assert.equal(uazapiMessageType("DocumentMessage"), "DOCUMENT");
});

test("pré-atendimento automático acontece somente na primeira mensagem do lead", () => {
  assert.equal(shouldUseAutomaticPreAttendance(false, 0), true);
  assert.equal(shouldUseAutomaticPreAttendance(false, 1), false);
  assert.equal(shouldUseAutomaticPreAttendance(true, 0), false);
});

test("interpreta texto, direção e mídia sem expor o token", () => {
  const message = { messageid: "external-1", messageType: "AudioMessage", fromMe: true, content: { text: "Áudio enviado" } };
  assert.equal(uazapiMessageContent(message), "Áudio enviado");
  assert.equal(uazapiMessageSender(message), "CORRETOR");
  assert.equal(uazapiMessageType(message.messageType), "AUDIO");
  assert.equal(uazapiMediaUrl(message, "lead-1"), "/api/uazapi/media?messageId=external-1&leadId=lead-1");
});

test("fingerprint evita duplicar a mesma mensagem no mesmo minuto", () => {
  const first = uazapiFingerprint("LEAD", "Olá", new Date("2026-10-06T12:00:05Z"));
  const second = uazapiFingerprint("LEAD", "Olá", new Date("2026-10-06T12:00:50Z"));
  assert.equal(first, second);
});
