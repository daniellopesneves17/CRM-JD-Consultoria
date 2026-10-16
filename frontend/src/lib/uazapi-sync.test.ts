import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldUseAutomaticPreAttendance,
  uazapiContactName,
  uazapiContactPhone,
  uazapiChatAvatar,
  uazapiChatName,
  uazapiFingerprint,
  uazapiMediaUrl,
  uazapiMessageContent,
  uazapiMessageDate,
  uazapiMessageSender,
  uazapiMessageType,
  uazapiPageReachedCutoff,
  uazapiPhone,
} from "./uazapi-sync";

test("normaliza contato, nome e data do histórico da Uazapi", () => {
  const chat = { phone: "+55 (11) 99999-0000", wa_contactName: "Cliente Teste", imagePreview: "https://example.com/avatar.jpg" };
  assert.equal(uazapiPhone(chat, "5511999990000@s.whatsapp.net"), "5511999990000");
  assert.equal(uazapiChatName(chat, {}, "5511999990000"), "Cliente Teste");
  assert.equal(uazapiChatAvatar(chat), "https://example.com/avatar.jpg");
  assert.equal(uazapiMessageDate(1_790_000_000_000).getTime(), 1_790_000_000_000);
});

test("não usa o nome do corretor em mensagens enviadas como nome do cliente", () => {
  assert.equal(uazapiChatName(undefined, { fromMe: true, senderName: "Nome do corretor" }, "5521999991234"), "WhatsApp 1234");
  assert.equal(uazapiChatName(undefined, { fromMe: false, senderName: "Nome da cliente" }, "5521999991234"), "Nome da cliente");
});

test("normaliza contatos da agenda da Uazapi", () => {
  const contact = { jid: "5522999990000@s.whatsapp.net", contact_name: "Contato da agenda" };
  assert.equal(uazapiContactPhone(contact), "5522999990000");
  assert.equal(uazapiContactName(contact, "5522999990000"), "Contato da agenda");
  assert.equal(uazapiContactPhone({ jid: "123456789@lid" }), "");
});

test("diferencia vídeo de documento", () => {
  assert.equal(uazapiMessageType("VideoMessage"), "VIDEO");
  assert.equal(uazapiMessageType("DocumentMessage"), "DOCUMENT");
});

test("pré-atendimento automático acontece somente na primeira mensagem do lead", () => {
  assert.equal(shouldUseAutomaticPreAttendance(false, 0), true);
  assert.equal(shouldUseAutomaticPreAttendance(false, 0, false), false);
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

test("reconciliação encerra a paginação ao alcançar a janela já sincronizada", () => {
  const since = new Date("2026-10-16T18:00:00Z");
  assert.equal(uazapiPageReachedCutoff([{ messageTimestamp: new Date("2026-10-16T18:05:00Z").getTime() }], since), false);
  assert.equal(uazapiPageReachedCutoff([{ messageTimestamp: new Date("2026-10-16T17:59:00Z").getTime() }], since), true);
});
