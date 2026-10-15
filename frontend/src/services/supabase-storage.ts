// Uploads privados ao Supabase Storage usando service role somente no servidor.
import { createClient } from "@supabase/supabase-js";

export const PUBLIC_ASSET_MAX_BYTES = 20 * 1024 * 1024;
export const PUBLIC_ASSET_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const PROFIT_PROOF_MAX_BYTES = 20 * 1024 * 1024;
export const PROFIT_PROOF_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function uploadFile(bucket: "proposals" | "audios" | "assets", path: string, data: Uint8Array, contentType: string) {
  const client = storageClient();
  const { error } = await client.storage.from(bucket).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signedError) throw new Error(`Falha ao assinar arquivo: ${signedError.message}`);
  return signed.signedUrl;
}

export async function uploadPublicAsset(path: string, data: Uint8Array, contentType: string) {
  const client = storageClient();
  const { error } = await client.storage.from("assets").upload(path, data, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return client.storage.from("assets").getPublicUrl(path).data.publicUrl;
}

export function publicAssetExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function validatePublicAsset(contentType: unknown, size: unknown) {
  if (typeof contentType !== "string" || !PUBLIC_ASSET_TYPES.has(contentType) || typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > PUBLIC_ASSET_MAX_BYTES) {
    throw new Error("Envie uma imagem PNG, JPG ou WebP de até 20 MB.");
  }
}

export async function createPublicAssetUpload(path: string) {
  const client = storageClient();
  const { data, error } = await client.storage.from("assets").createSignedUploadUrl(path, { upsert: false });
  if (error) throw new Error(`Falha ao autorizar upload: ${error.message}`);
  return {
    path,
    signedUrl: data.signedUrl,
  };
}

export function getPublicAssetUrl(path: string) {
  return storageClient().storage.from("assets").getPublicUrl(path).data.publicUrl;
}

export async function publicAssetExists(path: string) {
  const separator = path.lastIndexOf("/");
  const folder = separator >= 0 ? path.slice(0, separator) : "";
  const name = path.slice(separator + 1);
  const { data, error } = await storageClient().storage.from("assets").list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`Falha ao confirmar upload: ${error.message}`);
  return data.some((object) => object.name === name);
}

export function validateProfitProof(contentType: unknown, size: unknown) {
  if (typeof contentType !== "string" || !PROFIT_PROOF_TYPES.has(contentType) || typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > PROFIT_PROOF_MAX_BYTES) {
    throw new Error("Envie um comprovante PNG, JPG, WebP ou PDF de até 20 MB.");
  }
}

export function profitProofExtension(contentType: string) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function createProfitProofUpload(path: string) {
  const { data, error } = await storageClient().storage.from("profit-proofs").createSignedUploadUrl(path, { upsert: false });
  if (error) throw new Error(`Falha ao autorizar o comprovante: ${error.message}`);
  return { path, signedUrl: data.signedUrl };
}

export async function profitProofExists(path: string) {
  const separator = path.lastIndexOf("/");
  const folder = separator >= 0 ? path.slice(0, separator) : "";
  const name = path.slice(separator + 1);
  const { data, error } = await storageClient().storage.from("profit-proofs").list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`Falha ao confirmar o comprovante: ${error.message}`);
  return data.some((object) => object.name === name);
}

export async function createProfitProofViewUrl(path: string) {
  const { data, error } = await storageClient().storage.from("profit-proofs").createSignedUrl(path, 5 * 60);
  if (error) throw new Error(`Falha ao abrir o comprovante: ${error.message}`);
  return data.signedUrl;
}

export async function getStorageUsage() {
  const client = storageClient();
  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) throw new Error(error.message);
  let bytes = 0;
  for (const bucket of buckets) {
    const { data } = await client.storage.from(bucket.name).list("", { limit: 1000 });
    for (const object of data ?? []) {
      const metadata = object.metadata as { size?: number } | null;
      bytes += metadata?.size ?? 0;
    }
  }
  return { bytes, buckets: buckets.length };
}
