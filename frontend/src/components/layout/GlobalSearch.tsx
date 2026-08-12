"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, Search, UserRound, X } from "lucide-react";

type SearchItem = {
  id: string;
  type: "lead" | "proposal";
  title: string;
  subtitle: string;
  meta: string;
  href: string;
};

export function GlobalSearch() {
  const router = useRouter();
  const desktopRoot = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const body = await response.json();
        if (response.ok) setItems(body.items || []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!desktopRoot.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function choose(item: SearchItem) {
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
    router.push(item.href);
  }

  const results = (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      {loading ? <div className="flex items-center gap-2 p-5 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/>Buscando...</div>
        : query.trim().length < 2 ? <p className="p-5 text-sm text-slate-500">Digite ao menos 2 caracteres.</p>
        : items.length ? <div className="max-h-96 overflow-y-auto p-2">{items.map((item) => {
          const Icon = item.type === "lead" ? UserRound : FileText;
          return <button key={`${item.type}:${item.id}`} type="button" onClick={() => choose(item)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-blue-300"><Icon size={17}/></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><span className="block truncate text-xs text-slate-500">{item.subtitle}</span></span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">{item.meta.replaceAll("_", " ")}</span>
          </button>;
        })}</div>
        : <p className="p-5 text-sm text-slate-500">Nenhum lead ou proposta encontrado.</p>}
    </div>
  );

  return <div className="relative min-w-0 flex-1 lg:max-w-md" ref={desktopRoot}>
    <div className="relative hidden lg:block">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
      <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm transition focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100" placeholder="Buscar lead, telefone ou proposta..." aria-label="Busca global"/>
      {open && <div className="absolute left-0 right-0 top-12 z-50">{results}</div>}
    </div>
    <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 lg:hidden" aria-label="Abrir busca"><Search size={18}/></button>
    {mobileOpen && <div className="fixed inset-0 z-[70] bg-slate-950/60 p-4 backdrop-blur-sm lg:hidden">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Buscar lead, telefone ou proposta..." aria-label="Busca global móvel"/></div><button type="button" onClick={() => setMobileOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border dark:border-slate-700" aria-label="Fechar busca"><X size={19}/></button></div>
        <div className="mt-3">{results}</div>
      </div>
    </div>}
  </div>;
}
