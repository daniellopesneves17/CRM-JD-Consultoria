import assert from "node:assert/strict";
import test from "node:test";
import { hasExplicitJdAiConfirmation, JD_AI_CRM_TOOLS } from "@/services/ai/jd-ai-tools";

test("exige confirmação no início da mensagem para ações críticas", () => {
  assert.equal(hasExplicitJdAiConfirmation("CONFIRMAR: enviar a mensagem"), true);
  assert.equal(hasExplicitJdAiConfirmation("  confirmar exclusão"), true);
  assert.equal(hasExplicitJdAiConfirmation("Pode confirmar por mim"), false);
  assert.equal(hasExplicitJdAiConfirmation("Não confirmar"), false);
});

test("expõe um conjunto pequeno e sem nomes duplicados de ferramentas do CRM", () => {
  const names = JD_AI_CRM_TOOLS.map((tool) => tool.name);
  assert.equal(names.length <= 20, true);
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.includes("crm_consultar"), true);
  assert.equal(names.includes("crm_salvar_automacao"), true);
  assert.equal(names.includes("crm_enviar_whatsapp"), true);
});
