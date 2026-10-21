import assert from "node:assert/strict";
import test from "node:test";
import {
  backupConversationPreview,
  decryptWhatsAppBackup,
  encryptWhatsAppBackup,
  parseWhatsAppBackupFileName,
  whatsappBackupFileName,
  type WhatsAppBackupPayload,
} from "./whatsapp-backup";

const payload: WhatsAppBackupPayload = {
  format: "jd-whatsapp-backup",
  version: 1,
  exportedAt: "2026-10-21T18:00:00.000Z",
  owner: { id: "user-1", name: "Jefferson" },
  conversations: [{
    id: "conversation-1",
    status: "HUMANO",
    sentiment: "NEUTRO",
    isUrgent: false,
    aiSummary: null,
    createdAt: "2026-10-21T17:00:00.000Z",
    updatedAt: "2026-10-21T18:00:00.000Z",
    lead: { id: "lead-1", name: "Cliente", phone: "5522999999999", avatarUrl: null },
    messages: [{
      id: "message-1",
      sender: "LEAD",
      content: "Olá, preciso de ajuda",
      type: "TEXT",
      mediaUrl: null,
      transcription: null,
      sentAt: "2026-10-21T18:00:00.000Z",
      deliveredAt: null,
      readAt: null,
    }],
  }],
};

test("criptografa e restaura um backup sem perder mensagens", async () => {
  const encrypted = await encryptWhatsAppBackup(payload, "senha-forte-123");
  assert.equal(encrypted.includes(Buffer.from("Olá, preciso de ajuda")), false);
  const restored = await decryptWhatsAppBackup(encrypted, "senha-forte-123");
  assert.deepEqual(restored, payload);
});

test("não abre o backup com senha incorreta", async () => {
  const encrypted = await encryptWhatsAppBackup(payload, "senha-forte-123");
  await assert.rejects(() => decryptWhatsAppBackup(encrypted, "senha-errada-456"), /Senha incorreta/);
});

test("gera e interpreta metadados do nome do arquivo", () => {
  const name = whatsappBackupFileName(new Date("2026-10-21T18:00:00.123Z"), 12, 345);
  assert.equal(name, "2026-10-21T18-00-00-123Z__12__345.jdbackup");
  assert.deepEqual(parseWhatsAppBackupFileName(name), {
    createdAt: "2026-10-21T18:00:00.123Z",
    conversationCount: 12,
    messageCount: 345,
  });
});

test("resume o conteúdo da última mensagem", () => {
  assert.equal(backupConversationPreview(payload.conversations[0]), "Olá, preciso de ajuda");
});
