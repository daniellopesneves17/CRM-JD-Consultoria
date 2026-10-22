import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUazapiStatus } from "./uazapi-status";

test("normaliza status recebido com timestamp em segundos", () => {
  const status = normalizeUazapiStatus({
    id: "status-1",
    senderName: "Ana",
    sender_pn: "5511999999999@s.whatsapp.net",
    messageType: "ImageMessage",
    messageTimestamp: 1_700_000_000,
    text: "Novidade",
    content: { JPEGThumbnail: "a".repeat(100) },
  });
  assert.equal(status?.author, "Ana");
  assert.equal(status?.type, "image");
  assert.equal(status?.hasMedia, true);
  assert.equal(status?.createdAt, "2023-11-14T22:13:20.000Z");
});

test("marca status indisponível e rejeita registro sem id", () => {
  assert.equal(normalizeUazapiStatus({ messageType: "text" }), null);
  assert.equal(normalizeUazapiStatus({ id: "x", messageType: "error" })?.type, "unavailable");
});
