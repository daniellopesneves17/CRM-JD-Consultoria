// Testes das regras críticas de senha e dos cálculos usados no perfil do corretor.
import assert from "node:assert/strict";
import test from "node:test";
import { firstResponseAverage, percentage, strongPasswordSchema } from "./admin-users";

test("senha administrativa exige tamanho, maiúscula e número", () => {
  assert.equal(strongPasswordSchema.safeParse("Corretor2026").success, true);
  assert.equal(strongPasswordSchema.safeParse("corretor2026").success, false);
  assert.equal(strongPasswordSchema.safeParse("Corretor").success, false);
  assert.equal(strongPasswordSchema.safeParse("Crm1").success, false);
});

test("percentual não produz divisão inválida", () => {
  assert.equal(percentage(5, 10), 50);
  assert.equal(percentage(1, 3), 33.3);
  assert.equal(percentage(0, 0), 0);
});

test("tempo médio considera a primeira resposta posterior ao lead", () => {
  const start = new Date("2026-08-04T12:00:00.000Z");
  const result = firstResponseAverage([
    { messages: [{ sender: "LEAD", sentAt: start }, { sender: "CORRETOR", sentAt: new Date(start.getTime() + 10 * 60_000) }] },
    { messages: [{ sender: "LEAD", sentAt: start }, { sender: "BOT", sentAt: new Date(start.getTime() + 20 * 60_000) }] },
  ]);
  assert.equal(result, 15);
});
