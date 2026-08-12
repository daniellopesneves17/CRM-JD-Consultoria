"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => { if (status === "unauthenticated" || status === "authenticated" && data?.user?.role !== "ADMIN") router.replace("/dashboard"); }, [status, data, router]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen]);

  if (status === "loading") return <div className="p-8"><Skeleton className="h-16 w-full"/><Skeleton className="mt-6 h-96 w-full"/></div>;
  if (data?.user?.role !== "ADMIN") return null;
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AdminSidebar mobileOpen={mobileMenuOpen} onClose={closeMobileMenu}/>
    {mobileMenuOpen && <button type="button" onClick={closeMobileMenu} className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden" aria-label="Fechar menu"/>}
    <div className="lg:pl-72"><header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b bg-white/90 px-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-8">
      <button type="button" onClick={() => setMobileMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border dark:border-slate-700 lg:hidden" aria-label="Abrir menu administrativo"><Menu size={19}/></button>
      <div><h1 className="text-lg font-semibold">Painel Administrativo</h1><p className="text-xs text-slate-500">{data.user.name || data.user.email}</p></div>
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"><ShieldCheck size={13}/>ADMIN</span><ThemeToggle/>
    </header><main className="mx-auto w-full max-w-[1680px] p-5 md:p-8 lg:p-10">{children}</main></div>
  </div>;
}
