import assert from "node:assert/strict";
import test from "node:test";
import { contactNameRiskReasons, isSafeContactName, isSafeGreetingName, normalizeContactName } from "./contact-name";

test("normaliza espaços sem alterar acentos do nome", () => {
  assert.equal(normalizeContactName("  Maria   José  "), "Maria José");
});

test("detecta rótulos de agenda e nomes repetidos", () => {
  assert.deepEqual(contactNameRiskReasons("Plano Michele Msb", 1), ["rotulo_de_agenda"]);
  assert.deepEqual(contactNameRiskReasons("Jefferson Eduardo", 4), ["nome_repetido_em_multiplos_numeros"]);
});

test("aceita somente nomes pessoais seguros para saudação", () => {
  assert.equal(isSafeContactName("Leda Souza"), true);
  assert.equal(isSafeGreetingName("Maria Clara"), true);
  assert.equal(isSafeGreetingName("Plano Michele"), false);
  assert.equal(isSafeGreetingName("Cliente 21999999999"), false);
});

