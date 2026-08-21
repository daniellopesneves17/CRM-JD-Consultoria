"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Bot, FileText, HeartPulse, Home, LoaderCircle, MessageSquare, Settings, ShieldCheck, Target, TrendingUp, Users, X, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const links = [
  ["/dashboard", "Dashboard", Home], ["/jd-ai", "JD AI", Bot], ["/inbox", "Inbox WhatsApp", MessageSquare], ["/pipeline", "Pipeline", BarChart3],
  ["/leads", "Leads", Users], ["/proposals", "Propostas", FileText], ["/automations", "Automações", Zap],
  ["/goals", "Metas", Target], ["/metrics", "Métricas", TrendingUp], ["/settings", "Minha conta", Settings],
] as const;

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const { data: session } = useSession();
  const visibleLinks = session?.user?.role === "ADMIN" ? [...links, ["/admin", "Admin", ShieldCheck] as const] : links;

  useEffect(() => { setPendingPath(null); onClose(); }, [pathname, onClose]);

  return <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/[.06] bg-slate-950 text-slate-300 shadow-2xl shadow-slate-950/10 transition-transform duration-200 md:w-64 md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600"><HeartPulse className="text-white"/></span><div><strong className="block text-white">CRM JD</strong><span className="text-xs text-slate-500">Gestão comercial</span></div><button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white md:hidden" aria-label="Fechar menu"><X size={19}/></button></div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">{visibleLinks.map(([href, label, Icon]) => {
      const active = (pendingPath ?? pathname).startsWith(href);
      const pending = pendingPath === href && pathname !== href;
      return <Link key={href} href={href} onClick={() => { setPendingPath(href); onClose(); }} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all", active ? "bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-lg shadow-blue-950/20" : "hover:translate-x-0.5 hover:bg-white/[.06] hover:text-white")}>
        {pending ? <LoaderCircle className="animate-spin" size={18}/> : <Icon size={18}/>}<span>{label}</span>
      </Link>;
    })}</nav>
    <div className="border-t border-white/10 p-4 text-xs text-slate-500">JD Consultoria e Vendas<br/><span className="text-emerald-400">● Operação protegida</span></div>
  </aside>;
}
