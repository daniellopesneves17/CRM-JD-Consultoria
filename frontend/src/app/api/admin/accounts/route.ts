// Lista e cria contas com autorização exclusiva do administrador principal.
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { hashPassword, performanceInsight, publicAccount, readAdminStore, saveAdminStore } from "@/lib/admin-store";

const isAdmin = (email?: string | null) => email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const store = await readAdminStore();
  return NextResponse.json({ settings: store.settings, accounts: store.accounts.map((account) => ({ ...publicAccount(account), insight: performanceInsight(account) })) });
}
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const input = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), target: z.number().min(0).default(0) }).parse(await request.json());
  const store = await readAdminStore();
  if (store.accounts.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) return NextResponse.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });
  store.accounts.push({ id: randomUUID(), name: input.name, email: input.email.toLowerCase(), passwordHash: hashPassword(input.password), role: "CORRETOR", active: true, crmEnabled: true, createdAt: new Date().toISOString(), metrics: { leads: 0, qualified: 0, closed: 0, revenue: 0, target: input.target, current: 0, averageTicket: 0 } });
  await saveAdminStore(store);
  return NextResponse.json({ success: true }, { status: 201 });
}

