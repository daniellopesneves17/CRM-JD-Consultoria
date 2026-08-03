import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertAccountAccess } from "../src/plugins/auth.js";

const available = { crmEnabled: true, maintenanceMessage: "CRM em manutenção." };

describe("assertAccountAccess", () => {
  it("mantém o administrador ativo durante a manutenção global", () => {
    expect(() => assertAccountAccess({ active: true, crmEnabled: true, role: Role.ADMIN })).not.toThrow();
  });

  it("bloqueia imediatamente uma conta desativada", () => {
    expect(() => assertAccountAccess({ active: false, crmEnabled: true, role: Role.CORRETOR }, available)).toThrowError(/conta desativada/i);
  });

  it("bloqueia corretor quando a conta ou o CRM global estão desligados", () => {
    expect(() => assertAccountAccess({ active: true, crmEnabled: false, role: Role.CORRETOR }, available)).toThrowError(/CRM em manutenção/i);
    expect(() => assertAccountAccess(
      { active: true, crmEnabled: true, role: Role.CORRETOR },
      { ...available, crmEnabled: false }
    )).toThrowError(/CRM em manutenção/i);
  });
});
