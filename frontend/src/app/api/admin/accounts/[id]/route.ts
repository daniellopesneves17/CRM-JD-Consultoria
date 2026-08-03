// Atualiza disponibilidade, senha e meta de um corretor ou exclui sua conta.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { proxyToBackend } from "@/lib/backend-proxy";
const allowed = (email?: string | null) => email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const input = z.object({ active: z.boolean().optional(), crmEnabled: z.boolean().optional(), target: z.number().min(0).optional(), password: z.string().min(8).optional() }).parse(await request.json());
  const proxied = await proxyToBackend(`/admin/accounts/${id}`, session, { method: "PATCH", body: JSON.stringify(input) });
  if (proxied) return proxied;
  return NextResponse.json({ error: "API do CRM não configurada." }, { status: 503 });
}
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const proxied = await proxyToBackend(`/admin/accounts/${id}`, session, { method: "DELETE" });
  if (proxied) return proxied;
  return NextResponse.json({ error: "API do CRM não configurada." }, { status: 503 });
}
