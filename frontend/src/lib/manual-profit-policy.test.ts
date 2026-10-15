import assert from "node:assert/strict";
import test from "node:test";
import { resolveManualProfitBeneficiary } from "@/lib/manual-profit-policy";

test("corretor só consegue atribuir lucro a si mesmo", () => {
  assert.equal(resolveManualProfitBeneficiary({
    actorId: "corretor-atual",
    requestedUserId: "outro-corretor",
    hasProof: true,
    isAdmin: false,
  }), "corretor-atual");
});

test("corretor não registra lucro sem comprovante", () => {
  assert.throws(() => resolveManualProfitBeneficiary({
    actorId: "corretor-atual",
    hasProof: false,
    isAdmin: false,
  }), /Anexe um comprovante/);
});

test("administrador pode escolher o corretor e não depende de comprovante", () => {
  assert.equal(resolveManualProfitBeneficiary({
    actorId: "administrador",
    requestedUserId: "corretor-escolhido",
    hasProof: false,
    isAdmin: true,
  }), "corretor-escolhido");
});
