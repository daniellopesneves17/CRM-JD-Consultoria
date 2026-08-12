import { expect, test } from "@playwright/test";

test("exibe o formulário de acesso sem credenciais preenchidas", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Acesse sua operação" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveValue("");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeVisible();
  await expect(page.getByLabel("Permanecer conectado")).not.toBeChecked();
  await expect(page.getByRole("button", { name: /Entrar/ })).toBeEnabled();
});
