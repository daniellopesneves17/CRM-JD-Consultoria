// Configura o E2E contra o frontend local; o servidor é iniciado automaticamente.
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", fullyParallel: true, retries: 1,
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3000/login", reuseExistingServer: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }]
});
