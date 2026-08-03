// Fluxo crítico: usuário vê o login e tenta autenticar com a conta inicial.
import { test, expect } from "@playwright/test";
test("exibe acesso e credenciais iniciais", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Acesse sua operação" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveValue("danilopesedu11@gmail.com");
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Entrar/ })).toBeEnabled();
});
