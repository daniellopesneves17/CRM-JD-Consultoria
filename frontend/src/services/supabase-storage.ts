// Uploads privados ao Supabase Storage usando service role somente no servidor.
import { createClient } from "@supabase/supabase-js";

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage não configurado.");
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
  const { error } = await client.storage.from("assets").upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return client.storage.from("assets").getPublicUrl(path).data.publicUrl;
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
