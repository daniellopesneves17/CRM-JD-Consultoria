"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { CircleDot, Clock3, ImageIcon, LoaderCircle, Plus, RefreshCw, Send, ShieldCheck, Volume2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { WhatsAppStatusItem } from "@/lib/uazapi-status";

type StatusResponse = {
  owner: { id: string; name: string };
  items: WhatsAppStatusItem[];
  hasMore: boolean;
  nextOffset: number;
};

const fetcher = async <T,>(url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível carregar os Status.");
  return body;
};

const colors: Record<number, string> = {
  3: "#f59e0b",
  4: "#22c55e",
  7: "#06b6d4",
  8: "#2563eb",
  12: "#7c3aed",
  13: "#be185d",
  15: "#fb7185",
  19: "#334155",
};

function statusIcon(type: WhatsAppStatusItem["type"]) {
  if (type === "image") return <ImageIcon size={18}/>;
  if (type === "video") return <Video size={18}/>;
  if (type === "audio") return <Volume2 size={18}/>;
  return <CircleDot size={18}/>;
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function WhatsAppStatuses({ ownerId }: { ownerId?: string }) {
  const baseEndpoint = ownerId ? `/api/whatsapp-statuses?ownerId=${encodeURIComponent(ownerId)}` : "/api/whatsapp-statuses";
  const { data, error, isLoading, isValidating, mutate } = useSWR<StatusResponse>(baseEndpoint, fetcher, { refreshInterval: 60_000 });
  const [extraItems, setExtraItems] = useState<WhatsAppStatusItem[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(19);
  const [maxRecipients, setMaxRecipients] = useState(100);
  const [selected, setSelected] = useState<WhatsAppStatusItem | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setExtraItems([]);
    setNextOffset(data?.nextOffset ?? 0);
    setHasMore(data?.hasMore ?? false);
  }, [data, ownerId]);

  const items = useMemo(() => [...(data?.items ?? []), ...extraItems], [data?.items, extraItems]);

  function mediaUrl(item: WhatsAppStatusItem) {
    const params = new URLSearchParams({ messageId: item.id });
    if (ownerId) params.set("ownerId", ownerId);
    return `/api/whatsapp-statuses/media?${params.toString()}`;
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setActionError("");
    const response = await fetch("/api/whatsapp-statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, backgroundColor, font: 0, maxRecipients, ...(ownerId ? { ownerId } : {}) }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setActionError(body.error || "Não foi possível publicar o Status.");
    else {
      setComposerOpen(false);
      setText("");
      setExtraItems([]);
      await mutate();
    }
    setWorking(false);
  }

  async function loadMore() {
    setWorking(true);
    setActionError("");
    const separator = baseEndpoint.includes("?") ? "&" : "?";
    try {
      const page = await fetcher<StatusResponse>(`${baseEndpoint}${separator}offset=${nextOffset}`);
      setExtraItems((current) => [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextOffset(page.nextOffset);
      setHasMore(page.hasMore);
    } catch (loadError) {
      setActionError(loadError instanceof Error ? loadError.message : "Não foi possível carregar mais Status.");
    }
    setWorking(false);
  }

  return <div className="scrollbar h-full touch-pan-y overflow-y-auto overscroll-contain bg-slate-50 px-3 py-4 pb-8 dark:bg-slate-950 sm:px-6 sm:py-5">
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-600">WhatsApp</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">Status</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Veja as publicações recebidas nas últimas 24 horas e publique atualizações pelo App JD.</p></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={() => void mutate()} disabled={isValidating} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900" aria-label="Atualizar Status"><RefreshCw size={17} className={isValidating ? "animate-spin" : ""}/></button><Button onClick={() => { setComposerOpen(true); setActionError(""); }} className="min-h-11" aria-label="Publicar Status"><Plus size={17}/><span className="hidden sm:inline">Publicar</span></Button></div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><ShieldCheck size={16} className="mt-0.5 shrink-0"/><p>A conexão é feita no servidor com a conta do corretor. Nenhum Status ou token é salvo no celular.</p></div>
      {actionError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{actionError}</p>}
      {isLoading && <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-emerald-600"/></div>}
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error.message}</p>}

      {!isLoading && !error && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <button key={item.id} type="button" onClick={() => item.hasMedia && setSelected(item)} disabled={!item.hasMedia} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900">
          {item.thumbnail ? <img src={item.thumbnail} alt="Prévia do Status" className="h-40 w-full object-cover"/> : <div className="grid h-28 place-items-center bg-gradient-to-br from-emerald-500 to-cyan-700 text-white">{statusIcon(item.type)}</div>}
          <div className="p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-900 text-sm font-bold text-white">{item.authorImage ? <img src={item.authorImage} alt="" className="h-full w-full object-cover"/> : item.author.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.fromMe ? "Meu Status" : item.author}</strong><span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 size={11}/>{timeLabel(item.createdAt)}</span></span><span className="text-emerald-600">{statusIcon(item.type)}</span></div>{item.text && <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.text}</p>}{item.type === "unavailable" && <p className="mt-3 text-xs text-amber-600">Conteúdo ainda não disponível para abertura.</p>}</div>
        </button>)}
        {items.length === 0 && <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900 sm:col-span-2 lg:col-span-3"><div><CircleDot className="mx-auto text-slate-300" size={40}/><strong className="mt-3 block text-sm">Nenhum Status disponível</strong><p className="mt-1 text-xs text-slate-500">O WhatsApp mantém essas publicações por aproximadamente 24 horas.</p></div></div>}
      </div>}
      {hasMore && <button type="button" disabled={working} onClick={() => void loadMore()} className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{working ? "Carregando..." : "Carregar mais Status"}</button>}
    </div>

    {composerOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-slate-950/70 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4"><form onSubmit={publish} className="scrollbar max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Novo Status</p><h2 className="mt-1 text-xl font-bold">Publicar texto no WhatsApp</h2></div><button type="button" onClick={() => setComposerOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar"><X size={18}/></button></div><div className="mt-4 grid min-h-44 place-items-center rounded-2xl p-5 text-center text-white shadow-inner" style={{ background: colors[backgroundColor] ?? colors[19] }}><p className="whitespace-pre-wrap break-words text-xl font-semibold leading-8">{text || "Seu texto aparecerá assim"}</p></div><label className="mt-4 block text-sm font-semibold">Texto<textarea required maxLength={656} value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="Escreva sua atualização"/><span className="mt-1 block text-right text-[10px] text-slate-400">{text.length}/656</span></label><fieldset className="mt-3"><legend className="text-sm font-semibold">Cor de fundo</legend><div className="mt-2 flex flex-wrap gap-2">{Object.entries(colors).map(([key, color]) => <button key={key} type="button" onClick={() => setBackgroundColor(Number(key))} className="h-11 w-11 rounded-full border-4 shadow-sm" style={{ background: color, borderColor: backgroundColor === Number(key) ? "#a7f3d0" : "transparent" }} aria-label={`Selecionar cor ${key}`} aria-pressed={backgroundColor === Number(key)}/>)}</div></fieldset><label className="mt-4 block text-sm font-semibold">Limite de destinatários<input type="number" min={1} max={500} value={maxRecipients} onChange={(event) => setMaxRecipients(Math.max(1, Math.min(500, Number(event.target.value) || 1)))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-base dark:border-slate-700 dark:bg-slate-950"/></label><p className="mt-2 text-xs leading-5 text-slate-500">A Uazapi recomenda começar com uma audiência menor. O App JD limita cada publicação a no máximo 500 contatos.</p>{actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}<Button className="mt-5 min-h-12 w-full" disabled={working || !text.trim()}>{working ? <LoaderCircle className="animate-spin" size={17}/> : <Send size={17}/>} {working ? "Publicando..." : "Publicar Status"}</Button></form></div>}

    {selected && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-[max(.75rem,env(safe-area-inset-top))]"><div className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-black"><button type="button" onClick={() => setSelected(null)} className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white" aria-label="Fechar Status"><X size={20}/></button>{selected.type === "image" && <img src={mediaUrl(selected)} alt={selected.text || "Status do WhatsApp"} className="max-h-[78dvh] w-full object-contain"/>}{selected.type === "video" && <video src={mediaUrl(selected)} controls playsInline className="max-h-[78dvh] w-full"/>}{selected.type === "audio" && <div className="grid min-h-60 place-items-center p-8"><audio src={mediaUrl(selected)} controls className="w-full"/></div>}{selected.text && <p className="bg-black px-5 py-4 text-sm leading-6 text-white">{selected.text}</p>}</div></div>}
  </div>;
}
