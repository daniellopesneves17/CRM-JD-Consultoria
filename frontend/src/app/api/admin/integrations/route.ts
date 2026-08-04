// Estado em tempo real das integrações Uazapi, OpenAI e Supabase, sem expor segredos.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { getUazapiStatus } from "@/services/uazapi";
import { getStorageUsage } from "@/services/supabase-storage";

function bytesLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await operation(controller.signal); } finally { clearTimeout(timer); }
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [lastMessage, localCost, uazapiResult, openaiResult, supabaseResult] = await Promise.all([
      prisma.message.findFirst({ where: { sender: "LEAD" }, orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
      prisma.aiLog.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { estimatedCostUsd: true } }),
      withTimeout((signal) => getUazapiStatus(signal)).then((data) => ({ ok: true as const, data })).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "Erro" })),
      withTimeout(async (signal) => {
        if (!process.env.OPENAI_API_KEY) throw new Error("Chave não configurada");
        const response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.json() as { data?: Array<{ id: string }> };
      }).then((data) => ({ ok: true as const, data })).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "Erro" })),
      withTimeout(async () => {
        const [users, leads, conversations, proposals, storage] = await Promise.all([prisma.user.count(), prisma.lead.count(), prisma.conversation.count(), prisma.proposal.count(), getStorageUsage()]);
        return { totalRows: users + leads + conversations + proposals, storage };
      }).then((data) => ({ ok: true as const, data })).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "Erro" }))
    ]);
    const uazapiData = uazapiResult.ok ? uazapiResult.data : {};
    const state = String(uazapiData.state ?? uazapiData.status ?? uazapiData.instance?.toString() ?? "").toLowerCase();
    const connected = uazapiResult.ok && !["disconnected", "close", "closed", "error"].some((value) => state.includes(value));
    const qr = typeof uazapiData.qrCode === "string" ? uazapiData.qrCode : typeof uazapiData.qrcode === "string" ? uazapiData.qrcode : null;
    return NextResponse.json({
      uazapi: { status: connected ? "connected" : uazapiResult.ok ? "disconnected" : "error", instanceName: process.env.UAZAPI_INSTANCE_NAME ?? process.env.UAZAPI_INSTANCE ?? "JD Consultoria", lastMessage: lastMessage?.sentAt ?? null, qrCodeUrl: qr, detail: uazapiResult.ok ? state || "respondendo" : uazapiResult.error },
      openai: { status: openaiResult.ok ? "connected" : "error", modelsAvailable: openaiResult.ok ? (openaiResult.data.data ?? []).map((item) => item.id).filter((id) => /^(gpt|o\d)/.test(id)).slice(0, 12) : [], estimatedCostThisMonth: Number(localCost._sum.estimatedCostUsd ?? 0), detail: openaiResult.ok ? null : openaiResult.error },
      supabase: { status: supabaseResult.ok ? "connected" : "error", totalRows: supabaseResult.ok ? supabaseResult.data.totalRows : 0, storageUsed: supabaseResult.ok ? bytesLabel(supabaseResult.data.storage.bytes) : "0 KB", detail: supabaseResult.ok ? `${supabaseResult.data.storage.buckets} buckets` : supabaseResult.error }
    });
  } catch (error) {
    return apiError(error, "Não foi possível verificar as integrações.");
  }
}
