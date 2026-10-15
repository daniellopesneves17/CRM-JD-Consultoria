import assert from "node:assert/strict";
import test from "node:test";
import { PROFIT_PROOF_MAX_BYTES, validateProfitProof } from "@/services/supabase-storage";

test("aceita imagens e PDFs de até 20 MB", () => {
  for (const contentType of ["image/png", "image/jpeg", "image/webp", "application/pdf"]) {
    assert.doesNotThrow(() => validateProfitProof(contentType, PROFIT_PROOF_MAX_BYTES));
  }
});

test("recusa comprovante acima de 20 MB", () => {
  assert.throws(
    () => validateProfitProof("application/pdf", PROFIT_PROOF_MAX_BYTES + 1),
    /até 20 MB/,
  );
});

test("recusa comprovante vazio ou em formato não permitido", () => {
  assert.throws(() => validateProfitProof("image/png", 0), /PNG, JPG, WebP ou PDF/);
  assert.throws(() => validateProfitProof("image/svg+xml", 1024), /PNG, JPG, WebP ou PDF/);
});
