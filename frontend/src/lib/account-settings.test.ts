import assert from "node:assert/strict";
import test from "node:test";
import { accountSettingsSchema } from "./account-settings";

test("configurações pessoais aceitam perfil válido", () => {
  assert.equal(accountSettingsSchema.safeParse({ type: "profile", name: "Daniel Lopes", phone: "(22) 99999-9999" }).success, true);
});

test("alteração de senha exige senha forte", () => {
  assert.equal(accountSettingsSchema.safeParse({ type: "password", currentPassword: "senhaAtual1", newPassword: "fraca123" }).success, false);
  assert.equal(accountSettingsSchema.safeParse({ type: "password", currentPassword: "senhaAtual1", newPassword: "NovaSenha1" }).success, true);
});
