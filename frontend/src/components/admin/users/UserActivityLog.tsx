"use client";
// Linha do tempo paginada das ações de acesso e administração de cada usuário.
import { useEffect, useState } from "react";
import useSWR from "swr";
import { KeyRound, LogIn, LogOut, Repeat2, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { AccessLogItem } from "./types";

const fetcher = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Falha ao carregar histórico."); return response.json(); };
const iconByAction = { login: LogIn, logout: LogOut, password_reset: KeyRound, leads_transferred: Repeat2, leads_received: Repeat2, account_activated: ShieldCheck, account_deactivated: ShieldCheck, user_created: UserCog, profile_updated: UserCog } as const;
const labelByAction: Record<string, string> = { login: "Login realizado", logout: "Logout realizado", password_reset: "Senha redefinida pelo admin", leads_transferred: "Carteira transferida", leads_received: "Carteira recebida", account_activated: "Conta ativada", account_deactivated: "Conta desativada", user_created: "Conta criada", profile_updated: "Cadastro atualizado" };

export function UserActivityLog({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AccessLogItem[]>([]);
  const { data, error, isLoading } = useSWR<{ items: AccessLogItem[]; page: number; pages: number }>(`/api/admin/users/${userId}/access-logs?page=${page}&limit=50`, fetcher);
  useEffect(() => { setPage(1); setItems([]); }, [userId]);
  useEffect(() => { if (data) setItems((current) => page === 1 ? data.items : [...current, ...data.items.filter((item) => !current.some((existing) => existing.id === item.id))]); }, [data, page]);
  if (isLoading && page === 1) return <Skeleton className="h-64"/>;
  if (error) return <p className="text-sm text-red-600">Não foi possível carregar o histórico.</p>;
  if (!items.length) return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-700">Nenhum acesso registrado ainda.</div>;
  return <div><div className="space-y-1">{items.map((item) => {
    const Icon = iconByAction[item.action as keyof typeof iconByAction] || UserCog;
    return <div key={item.id} className="flex gap-4 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"><Icon size={17}/></span><div className="min-w-0 flex-1"><strong className="block text-sm">{labelByAction[item.action] || item.action.replaceAll("_", " ")}</strong>{item.detail && <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.detail}</p>}<div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-400"><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span>{item.ip && <span>IP {item.ip}</span>}</div></div></div>;
  })}</div>{data && page < data.pages && <Button variant="secondary" className="mt-4 w-full" onClick={() => setPage((value) => value + 1)}>Carregar mais</Button>}</div>;
}
