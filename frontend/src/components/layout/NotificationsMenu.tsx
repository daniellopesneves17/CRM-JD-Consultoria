"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Bell, CheckCheck, CircleAlert, Clock3, MessageSquare, Target, UserRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};
type NotificationResponse = { items: NotificationItem[]; unread: number };

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar notificações.");
  return response.json();
};

const icons = {
  NEW_MESSAGE: MessageSquare,
  LEAD_ASSIGNED: UserRound,
  TASK_OVERDUE: CircleAlert,
  TASK_DUE: Clock3,
  CONTRACT_EXPIRING: Target,
  SYSTEM_ERROR: CircleAlert,
} as const;

export function NotificationsMenu() {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { data, error, mutate } = useSWR<NotificationResponse>("/api/notifications", fetcher, { refreshInterval: 30_000, revalidateOnFocus: true });

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function markRead(id?: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
    await mutate();
  }

  return <div className="relative" ref={root}>
    <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label="Notificações" aria-expanded={open}>
      <Bell size={18}/>
      {!!data?.unread && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">{data.unread > 9 ? "9+" : data.unread}</span>}
    </button>
    {open && <div className="fixed inset-x-3 top-[76px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[390px]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"><div><strong className="text-sm">Notificações</strong><p className="text-xs text-slate-500">{data?.unread || 0} não lidas</p></div>{!!data?.unread && <button type="button" onClick={() => markRead()} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><CheckCheck size={15}/>Marcar todas</button>}</div>
      <div className="max-h-[65vh] overflow-y-auto p-2">
        {error ? <p className="p-4 text-sm text-red-600">Não foi possível carregar as notificações.</p>
          : !data ? <p className="p-4 text-sm text-slate-500">Carregando...</p>
          : data.items.length ? data.items.map((item) => {
            const Icon = icons[item.type as keyof typeof icons] || Bell;
            const content = <><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.readAt ? "bg-slate-100 text-slate-500 dark:bg-slate-800" : "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-blue-300"}`}><Icon size={17}/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong>{item.body && <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">{item.body}</span>}<span className="mt-1 block text-[11px] text-slate-400">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}</span></span>{!item.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600"/>}</>;
            return item.href ? <Link key={item.id} href={item.href} onClick={() => { setOpen(false); void markRead(item.id); }} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800">{content}</Link> : <button key={item.id} type="button" onClick={() => markRead(item.id)} className="flex w-full gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">{content}</button>;
          }) : <div className="p-8 text-center"><Bell className="mx-auto text-slate-300"/><strong className="mt-3 block text-sm">Tudo em dia</strong><p className="mt-1 text-xs text-slate-500">Nenhuma notificação no momento.</p></div>}
      </div>
    </div>}
  </div>;
}
