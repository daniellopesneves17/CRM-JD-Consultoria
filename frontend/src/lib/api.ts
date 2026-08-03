// Cliente HTTP tipado. Inclui o JWT da sessão e traduz falhas em mensagens úteis.
import { getSession } from "next-auth/react";
const baseUrl = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "production" ? "/api/backend" : "http://localhost:3001");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers }
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Não foi possível carregar os dados.");
  return body as T;
}
