import assert from "node:assert/strict";
import test from "node:test";
import { makeConversationTitle, normalizeJdAiSources, researchDateKey } from "./jd-ai";

test("cria títulos curtos e previsíveis para conversas", () => {
  assert.equal(makeConversationTitle("  Como funciona   a portabilidade? "), "Como funciona a portabilidade?");
  assert.equal(makeConversationTitle("a".repeat(70)), `${"a".repeat(55)}...`);
});

test("usa a data civil de São Paulo no boletim diário", () => {
  assert.equal(researchDateKey(new Date("2026-08-22T02:30:00.000Z")), "2026-08-21");
});

test("remove fontes repetidas e protocolos inseguros", () => {
  assert.deepEqual(normalizeJdAiSources([
    { title: "ANS", url: "https://www.gov.br/ans/" },
    { title: "ANS repetida", url: "https://www.gov.br/ans/" },
    { title: "Inválida", url: "javascript:alert(1)" },
  ]), [{ title: "ANS", url: "https://www.gov.br/ans/" }]);
});
