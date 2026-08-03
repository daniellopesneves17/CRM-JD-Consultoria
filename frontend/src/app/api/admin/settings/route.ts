// Controla disponibilidade global e política de publicação de atualizações.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { proxyToBackend } from "@/lib/backend-proxy";
import { readAdminStore, saveAdminStore } from "@/lib/admin-store";
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const input = z.object({ crmEnabled: z.boolean().optional(), updatePolicy: z.enum(["AUTOMATIC", "ON_COMPLETION"]).optional(), maintenanceMessage: z.string().min(3).max(240).optional() }).parse(await request.json());
  const proxied = await proxyToBackend("/admin/settings", session, { method: "PATCH", body: JSON.stringify(input) });
  if (proxied) return proxied;
  const store = await readAdminStore(); store.settings = { ...store.settings, ...input, updatedAt: new Date().toISOString() };
  await saveAdminStore(store); return NextResponse.json(store.settings);
}
