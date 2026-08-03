// Atualiza disponibilidade, senha e meta de um corretor ou exclui sua conta.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { proxyToBackend } from "@/lib/backend-proxy";
import { hashPassword, readAdminStore, saveAdminStore } from "@/lib/admin-store";
const allowed = (email?: string | null) => email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const input = z.object({ active: z.boolean().optional(), crmEnabled: z.boolean().optional(), target: z.number().min(0).optional(), password: z.string().min(8).optional() }).parse(await request.json());
  const proxied = await proxyToBackend(`/admin/accounts/${id}`, session, { method: "PATCH", body: JSON.stringify(input) });
  if (proxied) return proxied;
  const store = await readAdminStore(); const account = store.accounts.find((item) => item.id === id && item.role === "CORRETOR");
  if (!account) return NextResponse.json({ error: "Corretor não encontrado." }, { status: 404 });
  if (input.active !== undefined) account.active = input.active;
  if (input.crmEnabled !== undefined) account.crmEnabled = input.crmEnabled;
  if (input.target !== undefined) account.metrics.target = input.target;
  if (input.password) account.passwordHash = hashPassword(input.password);
  await saveAdminStore(store); return NextResponse.json({ success: true });
}
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!allowed(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const proxied = await proxyToBackend(`/admin/accounts/${id}`, session, { method: "DELETE" });
  if (proxied) return proxied;
  const store = await readAdminStore(); const before = store.accounts.length;
  store.accounts = store.accounts.filter((item) => item.id !== id || item.role === "ADMIN");
  if (store.accounts.length === before) return NextResponse.json({ error: "Corretor não encontrado." }, { status: 404 });
  await saveAdminStore(store); return NextResponse.json({ success: true });
}
