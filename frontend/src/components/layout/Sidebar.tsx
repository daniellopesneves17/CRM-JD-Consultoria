"use client";
// Navegação principal. O item ativo é inferido pela rota atual.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, HeartPulse, Home, MessageSquare, Settings, Target, TrendingUp, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";

const links = [
  ["/dashboard", "Dashboard", Home], ["/inbox", "Inbox WhatsApp", MessageSquare], ["/pipeline", "Pipeline", BarChart3],
  ["/leads", "Leads", Users], ["/proposals", "Propostas", FileText], ["/automations", "Automações", Zap],
  ["/goals", "Metas", Target], ["/metrics", "Métricas", TrendingUp], ["/settings", "Configurações", Settings]
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const {data:session}=useSession();
  const visibleLinks=session?.user?.role==="ADMIN"?[...links,["/admin","Admin",ShieldCheck] as const]:links;
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[.06] bg-slate-950 text-slate-300 shadow-2xl shadow-slate-950/10 md:flex">
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600"><HeartPulse className="text-white"/></span><div><strong className="block text-white">CRM JD</strong><span className="text-xs text-slate-500">Gestão comercial</span></div></div>
    <nav className="flex-1 space-y-1 px-3 py-5">{visibleLinks.map(([href, label, Icon]) => {
      const active = pathname.startsWith(href);
      return <Link key={href} href={href} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all", active ? "bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-lg shadow-blue-950/20" : "hover:translate-x-0.5 hover:bg-white/[.06] hover:text-white")}>
        <Icon size={18}/><span>{label}</span>
      </Link>;
    })}</nav>
    <div className="border-t border-white/10 p-4 text-xs text-slate-500">JD Consultoria e Vendas<br/><span className="text-emerald-400">● Operação protegida</span></div>
  </aside>;
}
