"use client";

import { Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { data } = useSession();
  return <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 shadow-[0_1px_0_rgba(15,23,42,.02)] backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/20 md:px-8">
    <button type="button" onClick={onOpenMenu} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden" aria-label="Abrir menu"><Menu/></button>
    <GlobalSearch/>
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      <ThemeToggle/>
      <NotificationsMenu/>
      <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{data?.user?.name || "Usuário"}</p><p className="text-xs text-slate-500 dark:text-slate-400">{data?.user?.role === "ADMIN" ? "Administrador" : "Corretor"}</p></div>
      <button onClick={() => signOut({ callbackUrl: "/login" })} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5" aria-label="Sair da conta">{(data?.user?.name || "Administrador").split(" ").map((word) => word[0]).slice(0, 2).join("")}</button>
    </div>
  </header>;
}
