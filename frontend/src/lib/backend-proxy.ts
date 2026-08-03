import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getBackendUrl } from "@/lib/backend-url";

type SessionWithToken = Session & { accessToken?: string };

function configurationError(message: string, status = 503) {
  return NextResponse.json({ error: message }, { status });
}

export async function proxyToBackend(
  path: string,
  session: Session | null,
  init: RequestInit = {}
): Promise<NextResponse | null> {
  const backendUrl = getBackendUrl();
  const token = (session as SessionWithToken | null)?.accessToken;

  if (!token || token === "local-only") {
    return process.env.NODE_ENV === "production"
      ? configurationError("Integração com a API não configurada.")
      : null;
  }

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers
      }
    });
    const body = response.status === 204 ? null : await response.text();
    const contentType = response.headers.get("content-type");

    return new NextResponse(body, {
      status: response.status,
      headers: contentType ? { "Content-Type": contentType } : undefined
    });
  } catch {
    return process.env.NODE_ENV === "production"
      ? configurationError("A API do CRM está indisponível.")
      : null;
  }
}
