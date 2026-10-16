import assert from "node:assert/strict";
import test from "node:test";
import { registeredBrokerFirstName, requireRegisteredBrokerFirstName } from "./broker-identity";
import { PERSONA_BASE } from "../services/ai/prompts";

test("usa somente o primeiro nome pessoal cadastrado do corretor", () => {
  assert.equal(registeredBrokerFirstName("Daniel Lopes"), "Daniel");
  assert.equal(registeredBrokerFirstName("  DANIELE   EDUARDO  "), "Daniele");
  assert.equal(registeredBrokerFirstName("João-Pedro Silva"), "João-Pedro");
});

test("não aceita nomes empresariais como identidade do corretor", () => {
  assert.equal(registeredBrokerFirstName("JD Consultoria"), null);
  assert.equal(registeredBrokerFirstName("Equipe Comercial"), null);
  assert.equal(registeredBrokerFirstName("Planos de Saúde"), null);
  assert.throws(() => requireRegisteredBrokerFirstName("Corretora JD"), /nome pessoal cadastrado/i);
});

test("o prompt de atendimento não contém uma identidade fixa ou empresarial", () => {
  assert.doesNotMatch(PERSONA_BASE, /\bAna\b|JD Consultoria/i);
  assert.match(PERSONA_BASE, /brokerFirstName/);
  assert.match(PERSONA_BASE, /Nunca use nome de empresa/i);
});
