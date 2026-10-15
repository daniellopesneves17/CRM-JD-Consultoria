"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import type { Conversation } from "@/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./ContactAvatar";

type Filter = "Todas" | "Urgentes" | "Normais";

function preview(conversation: Conversation) {
  const last = conversation.messages.at(-1);
  if (!last) return "Sem mensagens";
  if (last.type === "AUDIO") return "🎤 Áudio";
  if (last.type === "IMAGE") return "📷 Imagem";
  if (last.type === "VIDEO") return "🎬 Vídeo";
  if (last.type === "DOCUMENT") return "📎 Arquivo";
  return last.content.replace(/[\*_~`]/g, "");
}

export function ConversationList({ items, activeId, onSelect, onSync, syncing, syncStatus, className }: { items: Conversation[]; activeId?: string; onSelect: (id: string) => void; onSync: () => void; syncing: boolean; syncStatus: string; className?: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("Todas");
  const urgentCount = items.filter((item) => item.isUrgent || item.sentiment === "URGENTE").length;
  const list = useMemo(() => items
    .filter((conversation) => `${conversation.lead.name} ${conversation.lead.phone}`.toLowerCase().includes(search.toLowerCase().trim()))
    .filter((conversation) => filter === "Todas" || (filter === "Urgentes" ? conversation.isUrgent || conversation.sentiment === "URGENTE" : !conversation.isUrgent && conversation.sentiment !== "URGENTE"))
    .sort((left, right) => Number(right.isUrgent || right.sentiment === "URGENTE") - Number(left.isUrgent || left.sentiment === "URGENTE") || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()), [items, search, filter]);

  return <aside className={cn("w-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:w-[350px] xl:w-[380px]", className)}>
    <div className="shrink-0 border-b border-slate-200 p-3.5 dark:border-slate-800">
      <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-900 dark:text-white">Inbox WhatsApp</strong><p className="truncate text-[11px] text-emerald-600 dark:text-emerald-400">{syncStatus || "Sincronização automática ativa"}</p></div><button type="button" onClick={onSync} disabled={syncing} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900" aria-label="Sincronizar WhatsApp"><RefreshCw size={16} className={syncing ? "animate-spin" : ""}/></button></div>
      <label className="relative block"><Search className="absolute left-3 top-2.5 text-slate-400" size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm transition focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900" placeholder="Buscar nome ou telefone"/></label>
      <div className="mt-3 flex gap-1.5 overflow-x-auto">{(["Todas", "Urgentes", "Normais"] as Filter[]).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition", filter === item ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")}>{item === "Urgentes" && <AlertTriangle size={12}/>} {item}{item === "Urgentes" && urgentCount > 0 && <span className="rounded-full bg-white/20 px-1.5">{urgentCount}</span>}</button>)}</div>
    </div>
    <div className="scrollbar min-h-0 flex-1 overflow-y-auto">{list.length ? list.map((conversation) => <button key={conversation.id} onClick={() => onSelect(conversation.id)} className={cn("relative flex w-full gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900", activeId === conversation.id && "bg-brand-50/80 after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-r-full after:bg-brand-600 dark:bg-brand-950/25")}>
      <ContactAvatar name={conversation.lead.name} src={conversation.lead.avatarUrl} className="h-11 w-11"/>
      <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-sm text-slate-900 dark:text-slate-100">{conversation.lead.name}</strong><time className="whitespace-nowrap text-[10px] text-slate-400">{new Date(conversation.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></span><span className="mt-1 block truncate text-xs text-slate-500">{preview(conversation)}</span><span className="mt-1.5 flex items-center gap-2">{conversation.isUrgent || conversation.sentiment === "URGENTE" ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300"><AlertTriangle size={11}/>Urgente</span> : <span className="text-[10px] font-medium text-slate-400">Prioridade normal</span>}{conversation.status === "BOT" && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">IA inicial</span>}</span></span>
    </button>) : <div className="grid h-full min-h-40 place-items-center px-6 text-center text-sm text-slate-400">Nenhuma conversa encontrada.</div>}</div>
  </aside>;
}
