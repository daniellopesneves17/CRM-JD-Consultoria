import assert from "node:assert/strict";
import test from "node:test";
import { mergeJdAiContext, parseJdAiContextCommand } from "./jd-ai-context";

test("reconhece comandos explícitos de contexto no chat", () => {
  assert.deepEqual(parseJdAiContextCommand("/contexto Minha prioridade é vender planos PME."), { type: "append", content: "Minha prioridade é vender planos PME." });
  assert.deepEqual(parseJdAiContextCommand("Considere como contexto: trabalho no Rio."), { type: "append", content: "trabalho no Rio." });
  assert.deepEqual(parseJdAiContextCommand("/limpar contexto"), { type: "clear" });
  assert.equal(parseJdAiContextCommand("Quais são as novidades da ANS?"), null);
});

test("acumula contexto com limite seguro", () => {
  const context = mergeJdAiContext("- Primeiro fato", "Segundo fato");
  assert.equal(context, "- Primeiro fato\n- Segundo fato");
  assert.ok(mergeJdAiContext(null, "x").startsWith("- x"));
});
