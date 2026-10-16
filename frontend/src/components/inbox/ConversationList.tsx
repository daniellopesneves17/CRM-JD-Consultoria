"use client";

import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import type { Conversation } from "@/types";
import type { ConversationFilter } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./ContactAvatar";

function preview(conversation: Conversation) {
  const last = conversation.messages.at(-1);
  if (!last) return "Sem mensagens";
  if (last.type === "AUDIO") return "🎤 Áudio";
  if (last.type === "IMAGE") return "📷 Imagem";
  if (last.type === "VIDEO") return "🎬 Vídeo";
  if (last.type === "DOCUMENT") return "📎 Arquivo";
  return last.content.replace(/[\*_~`]/g, "");
}

export function ConversationList({ items, total, activeId, onSelect, onSync, syncing, syncStatus, search, onSearch, filter, onFilter, hasMore, onLoadMore, loadingMore, className }: { items: Conversation[]; total: number; activeId?: string; onSelect: (id: string) => void; onSync: () => void; syncing: boolean; syncStatus: string; search: string; onSearch: (value: string) => void; filter: ConversationFilter; onFilter: (value: ConversationFilter) => void; hasMore: boolean; onLoadMore: () => void; loadingMore: boolean; className?: string }) {
  const urgentCount = items.filter((item) => item.isUrgent || item.sentiment === "URGENTE").length;
  const filters: Array<{ label: string; value: ConversationFilter }> = [{ label: "Todas", value: "all" }, { label: "Urgentes", value: "urgent" }, { label: "Normais", value: "normal" }];

  return <aside className={cn("w-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:w-[350px] xl:w-[380px]", className)}>
    <div className="shrink-0 border-b border-slate-200 p-3.5 dark:border-slate-800">
      <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-900 dark:text-white">Inbox WhatsApp</strong><p className="truncate text-[11px] text-emerald-600 dark:text-emerald-400">{syncStatus || "Sincronização automática ativa"}</p></div><button type="button" onClick={onSync} disabled={syncing} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900" aria-label="Sincronizar WhatsApp"><RefreshCw size={16} className={syncing ? "animate-spin" : ""}/></button></div>
      <label className="relative block"><Search className="absolute left-3 top-2.5 text-slate-400" size={17}/><input value={search} onChange={(event) => onSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm transition focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900" placeholder="Buscar em todos os contatos"/></label>
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto">{filters.map((item) => <button key={item.value} type="button" onClick={() => onFilter(item.value)} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition", filter === item.value ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")}>{item.value === "urgent" && <AlertTriangle size={12}/>} {item.label}{item.value === "urgent" && urgentCount > 0 && <span className="rounded-full bg-white/20 px-1.5">{urgentCount}</span>}</button>)}<span className="ml-auto whitespace-nowrap text-[10px] font-medium text-slate-400">{total.toLocaleString("pt-BR")}</span></div>
    </div>
    <div className="scrollbar min-h-0 flex-1 overflow-y-auto">{items.length ? <>{items.map((conversation) => <button key={conversation.id} onClick={() => onSelect(conversation.id)} className={cn("relative flex w-full gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900", activeId === conversation.id && "bg-brand-50/80 after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-r-full after:bg-brand-600 dark:bg-brand-950/25")}>
      <ContactAvatar name={conversation.lead.name} src={conversation.lead.avatarUrl} className="h-11 w-11"/>
      <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-sm text-slate-900 dark:text-slate-100">{conversation.lead.name}</strong><time className="whitespace-nowrap text-[10px] text-slate-400">{new Date(conversation.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></span><span className="mt-1 block truncate text-xs text-slate-500">{preview(conversation)}</span><span className="mt-1.5 flex items-center gap-2">{conversation.isUrgent || conversation.sentiment === "URGENTE" ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300"><AlertTriangle size={11}/>Urgente</span> : <span className="text-[10px] font-medium text-slate-400">Prioridade normal</span>}{conversation.status === "BOT" && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">IA inicial</span>}</span></span>
    </button>)}{hasMore && <div className="p-3"><button type="button" onClick={onLoadMore} disabled={loadingMore} className="h-10 w-full rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300">{loadingMore ? "Carregando..." : `Carregar mais (${items.length.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")})`}</button></div>}</> : <div className="grid h-full min-h-40 place-items-center px-6 text-center text-sm text-slate-400">Nenhuma conversa encontrada.</div>}</div>
  </aside>;
}
