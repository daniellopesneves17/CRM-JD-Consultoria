"use client";

// Sugestão sob demanda: a IA nunca envia esta resposta sem ação do corretor.
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export function AiSuggestion({ conversationId, ownerId, onUse }: { conversationId: string; ownerId?: string; onUse: (text: string) => void }) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    setLoading(true); setError("");
    const response = await fetch(`/api/conversations/${conversationId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ send: false, ...(ownerId ? { ownerId } : {}) }) });
    const body = await response.json().catch(() => ({})) as { suggestion?: string; error?: string };
    if (response.ok && body.suggestion) setSuggestion(body.suggestion); else setError(body.error || "Não foi possível gerar a sugestão.");
    setLoading(false);
  }
  if (suggestion) return <div className="mb-2 rounded-xl border border-violet-200 bg-violet-50 p-2.5 dark:border-violet-900/70 dark:bg-violet-950/30"><div className="flex items-start gap-2"><Sparkles size={15} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300"/><p className="line-clamp-3 flex-1 text-xs leading-5 text-slate-700 dark:text-slate-200">{suggestion}</p><button type="button" onClick={() => setSuggestion("")} className="text-slate-400 hover:text-slate-700" aria-label="Descartar sugestão"><X size={15}/></button></div><button type="button" onClick={() => { onUse(suggestion); setSuggestion(""); }} className="mt-2 rounded-lg bg-violet-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-violet-600">Usar e editar</button></div>;
  return <div className="mb-2 flex items-center gap-2"><button type="button" onClick={generate} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/60"><Sparkles size={14}/>{loading ? "Gerando..." : "Sugerir com IA"}</button><span className="hidden text-[10px] text-slate-400 sm:inline">Somente sob demanda; revise antes de enviar.</span>{error && <span className="truncate text-[10px] font-medium text-red-600 dark:text-red-300">{error}</span>}</div>;
}
