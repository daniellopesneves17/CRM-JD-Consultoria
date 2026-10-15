import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@prisma/client";
import { executeJdAiCrmTool, hasExplicitJdAiConfirmation, JD_AI_CRM_TOOLS } from "@/services/ai/jd-ai-tools";

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
  assert.equal(names.includes("crm_executar_automacao"), true);
  assert.equal(names.includes("crm_enviar_whatsapp"), true);
});

test("execução manual de automação exige confirmação explícita", async () => {
  const output = JSON.parse(await executeJdAiCrmTool(
    "crm_executar_automacao",
    JSON.stringify({ id: "proposal-follow-up", limite: 1, usuario_id: null }),
    { actor: { id: "corretor-teste", role: Role.CORRETOR }, userMessage: "Execute o follow-up" },
  )) as { ok: boolean; error: string };
  assert.equal(output.ok, false);
  assert.match(output.error, /CONFIRMAR/);
});
