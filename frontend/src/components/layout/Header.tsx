"use client";
// Cabeçalho contextual com busca, tema, notificações e conta.
import { Bell, Menu, Search } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
export function Header() {
  const { data } = useSession();
  return <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-slate-200 bg-white/90 px-5 shadow-[0_1px_0_rgba(15,23,42,.02)] backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/20 md:px-8">
    <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden" aria-label="Abrir menu"><Menu/></button>
    <div className="relative hidden max-w-md flex-1 lg:block"><Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={18}/><input className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm transition focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900" placeholder="Buscar lead, telefone ou proposta..."/></div>
    <div className="ml-auto flex items-center gap-2 sm:gap-3"><ThemeToggle/><button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-blue-300" aria-label="Notificações"><Bell size={18}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"/></button>
      <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{data?.user?.name || "Administrador"}</p><p className="text-xs text-slate-500 dark:text-slate-400">Conta administradora</p></div>
      <button onClick={() => signOut({ callbackUrl: "/login" })} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5" aria-label="Sair da conta">{(data?.user?.name || "Administrador").split(" ").map((word) => word[0]).slice(0,2).join("")}</button>
    </div>
  </header>;
}
