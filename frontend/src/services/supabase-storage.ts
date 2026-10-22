// Uploads privados ao Supabase Storage usando service role somente no servidor.
import { createClient } from "@supabase/supabase-js";

export const PUBLIC_ASSET_MAX_BYTES = 20 * 1024 * 1024;
export const PUBLIC_ASSET_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const PROFIT_PROOF_MAX_BYTES = 20 * 1024 * 1024;
export const PROFIT_PROOF_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
export const WHATSAPP_BACKUP_BUCKET = "chat-backups";
export const WHATSAPP_BACKUP_MAX_BYTES = 100 * 1024 * 1024;
const WHATSAPP_BACKUP_CONTENT_TYPE = "application/vnd.jd-consultoria.whatsapp-backup+json";

let backupBucketReady: Promise<void> | undefined;

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureWhatsAppBackupBucket() {
  backupBucketReady ??= (async () => {
    const client = storageClient();
    const { data, error } = await client.storage.getBucket(WHATSAPP_BACKUP_BUCKET);
    if (!error && data) {
      if (data.public) {
        const { error: updateError } = await client.storage.updateBucket(WHATSAPP_BACKUP_BUCKET, {
          public: false,
          fileSizeLimit: WHATSAPP_BACKUP_MAX_BYTES,
          allowedMimeTypes: [WHATSAPP_BACKUP_CONTENT_TYPE],
        });
        if (updateError) throw new Error(`Falha ao proteger o cofre de backups: ${updateError.message}`);
      }
      return;
    }

    const { error: createError } = await client.storage.createBucket(WHATSAPP_BACKUP_BUCKET, {
      public: false,
      fileSizeLimit: WHATSAPP_BACKUP_MAX_BYTES,
      allowedMimeTypes: [WHATSAPP_BACKUP_CONTENT_TYPE],
    });
    if (createError && !/already exists|duplicate/i.test(createError.message)) {
      throw new Error(`Falha ao preparar o cofre de backups: ${createError.message}`);
    }
  })().catch((error) => {
    backupBucketReady = undefined;
    throw error;
  });
  return backupBucketReady;
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

export async function uploadWhatsAppBackup(path: string, data: Uint8Array) {
  await ensureWhatsAppBackupBucket();
  const { error } = await storageClient().storage.from(WHATSAPP_BACKUP_BUCKET).upload(path, data, {
    contentType: WHATSAPP_BACKUP_CONTENT_TYPE,
    cacheControl: "0",
    upsert: false,
  });
  if (error) throw new Error(`Falha ao guardar o backup: ${error.message}`);
}

export async function listWhatsAppBackups(ownerId: string) {
  await ensureWhatsAppBackupBucket();
  const { data, error } = await storageClient().storage.from(WHATSAPP_BACKUP_BUCKET).list(ownerId, {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(`Falha ao listar backups: ${error.message}`);
  return data.filter((item) => item.name.endsWith(".jdbackup"));
}

export async function downloadWhatsAppBackup(path: string) {
  await ensureWhatsAppBackupBucket();
  const { data, error } = await storageClient().storage.from(WHATSAPP_BACKUP_BUCKET).download(path);
  if (error) throw new Error(`Falha ao abrir o backup: ${error.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteWhatsAppBackup(path: string) {
  await ensureWhatsAppBackupBucket();
  const { error } = await storageClient().storage.from(WHATSAPP_BACKUP_BUCKET).remove([path]);
  if (error) throw new Error(`Falha ao excluir o backup: ${error.message}`);
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
