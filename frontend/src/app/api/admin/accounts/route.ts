// Lista e cria contas com autorização exclusiva do administrador principal.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { proxyToBackend } from "@/lib/backend-proxy";

const isAdmin = (email?: string | null) => email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const proxied = await proxyToBackend("/admin/overview", session);
  if (proxied) return proxied;
  return NextResponse.json({ error: "API do CRM não configurada." }, { status: 503 });
}
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const input = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), target: z.number().min(0).default(0) }).parse(await request.json());
  const proxied = await proxyToBackend("/admin/accounts", session, { method: "POST", body: JSON.stringify(input) });
  if (proxied) return proxied;
  return NextResponse.json({ error: "API do CRM não configurada." }, { status: 503 });
}
