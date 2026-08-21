"use client";

export const MAX_PUBLIC_ASSET_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

type Ticket = { path: string; signedUrl: string };
type FinishedUpload = { url: string };

function readError(response: Response, fallback: string) {
  return response.json().then((body: { error?: string }) => body.error || fallback).catch(() => fallback);
}

export async function uploadPublicAssetDirect(file: File, apiUrl: string, onProgress?: (percentage: number) => void) {
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > MAX_PUBLIC_ASSET_BYTES) {
    throw new Error("Envie uma imagem PNG, JPG ou WebP de até 20 MB.");
  }

  const ticketResponse = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  if (!ticketResponse.ok) throw new Error(await readError(ticketResponse, "Não foi possível autorizar o upload."));
  const ticket = await ticketResponse.json() as Ticket;

  await new Promise<void>((resolve, reject) => {
    const data = new FormData();
    data.append("cacheControl", "31536000");
    data.append("", file);

    const request = new XMLHttpRequest();
    request.open("PUT", ticket.signedUrl);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("A conexão foi interrompida durante o envio da imagem."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        try {
          const body = JSON.parse(request.responseText) as { message?: string; error?: string };
          reject(new Error(body.message || body.error || "Falha ao enviar a imagem."));
        } catch {
          reject(new Error("Falha ao enviar a imagem."));
        }
      }
    };
    request.send(data);
  });

  const finishResponse = await fetch(apiUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: ticket.path }),
  });
  if (!finishResponse.ok) throw new Error(await readError(finishResponse, "O arquivo foi enviado, mas não foi possível concluir a atualização."));
  return finishResponse.json() as Promise<FinishedUpload>;
}
