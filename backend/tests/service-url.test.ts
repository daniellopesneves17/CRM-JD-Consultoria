import { describe, expect, it } from "vitest";
import { rewriteServiceUrl } from "../src/utils/service-url.js";

describe("rewriteServiceUrl", () => {
  it("remove o prefixo público do serviço", () => {
    expect(rewriteServiceUrl({ url: "/api/backend/health" })).toBe("/health");
    expect(rewriteServiceUrl({ url: "/api/backend/leads?page=1" })).toBe("/leads?page=1");
  });

  it("preserva chamadas diretas e locais", () => {
    expect(rewriteServiceUrl({ url: "/health" })).toBe("/health");
  });
});
