// Cliente HTTP tipado para os Route Handlers do próprio Next.js.
const baseUrl = "/api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Não foi possível carregar os dados.");
  return body as T;
}
