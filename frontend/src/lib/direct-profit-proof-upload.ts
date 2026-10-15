"use client";

export const MAX_PROFIT_PROOF_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

export type UploadedProfitProof = { path: string; name: string; type: string; size: number };
type Ticket = { path: string; signedUrl: string };

function readError(response: Response, fallback: string) {
  return response.json().then((body: { error?: string }) => body.error || fallback).catch(() => fallback);
}

export function validateProfitProofFile(file: Pick<File, "type" | "size">) {
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > MAX_PROFIT_PROOF_BYTES) {
    throw new Error("Envie um comprovante PNG, JPG, WebP ou PDF de até 20 MB.");
  }
}

export async function uploadProfitProofDirect(file: File, onProgress?: (percentage: number) => void): Promise<UploadedProfitProof> {
  validateProfitProofFile(file);
  const ticketResponse = await fetch("/api/manual-profits/proof-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  if (!ticketResponse.ok) throw new Error(await readError(ticketResponse, "Não foi possível autorizar o comprovante."));
  const ticket = await ticketResponse.json() as Ticket;

  await new Promise<void>((resolve, reject) => {
    const data = new FormData();
    data.append("cacheControl", "3600");
    data.append("", file);
    const request = new XMLHttpRequest();
    request.open("PUT", ticket.signedUrl);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("A conexão foi interrompida durante o envio do comprovante."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        try {
          const body = JSON.parse(request.responseText) as { message?: string; error?: string };
          reject(new Error(body.message || body.error || "Falha ao enviar o comprovante."));
        } catch {
          reject(new Error("Falha ao enviar o comprovante."));
        }
      }
    };
    request.send(data);
  });

  return { path: ticket.path, name: file.name, type: file.type, size: file.size };
}
