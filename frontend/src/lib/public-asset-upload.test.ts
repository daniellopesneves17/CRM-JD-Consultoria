import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_ASSET_MAX_BYTES, validatePublicAsset } from "@/services/supabase-storage";

test("aceita imagens de até 20 MB", () => {
  assert.doesNotThrow(() => validatePublicAsset("image/jpeg", PUBLIC_ASSET_MAX_BYTES));
});

test("recusa imagem acima de 20 MB", () => {
  assert.throws(() => validatePublicAsset("image/png", PUBLIC_ASSET_MAX_BYTES + 1), /até 20 MB/);
});

test("recusa formatos não permitidos", () => {
  assert.throws(() => validatePublicAsset("image/svg+xml", 1024), /PNG, JPG ou WebP/);
});
