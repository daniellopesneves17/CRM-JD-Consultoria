"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bot, ClipboardList, HeartPulse, LayoutDashboard, Settings, ShieldCheck, Upload, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  ["/admin/dashboard", "Visão Executiva", LayoutDashboard],
  ["/admin/users", "Corretores", Users],
  ["/admin/automations", "Automações", Bot],
  ["/admin/carteira", "Saúde da Carteira", HeartPulse],
  ["/admin/settings", "Configurações", Settings],
  ["/admin/logs", "Logs", ClipboardList],
  ["/admin/import", "Importar Dados", Upload],
] as const;

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0A1628] text-slate-300 shadow-2xl transition-transform duration-200 lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
    <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600"><ShieldCheck className="text-white" size={20}/></span><div><strong className="block text-white">Admin JD</strong><span className="text-xs text-slate-500">Controle da operação</span></div><button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Fechar menu"><X size={19}/></button></div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={onClose} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition", pathname.startsWith(href) ? "bg-white/10 text-white shadow" : "hover:bg-white/[.06] hover:text-white")}><Icon size={18}/>{label}</Link>)}</nav>
    <div className="border-t border-white/10 p-4"><Link href="/dashboard" onClick={onClose} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[.06] hover:text-white"><ArrowLeft size={18}/>Voltar ao CRM</Link></div>
  </aside>;
}
