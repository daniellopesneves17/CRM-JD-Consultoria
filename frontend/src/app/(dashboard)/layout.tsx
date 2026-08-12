"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen]);

  if (pathname.startsWith("/admin")) return children;
  return <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
    <Sidebar mobileOpen={mobileMenuOpen} onClose={closeMobileMenu}/>
    {mobileMenuOpen && <button type="button" onClick={closeMobileMenu} className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm md:hidden" aria-label="Fechar menu"/>}
    <div className="md:pl-64"><Header onOpenMenu={() => setMobileMenuOpen(true)}/><main className="mx-auto w-full max-w-[1600px] p-5 md:p-8 lg:p-10">{children}</main></div>
  </div>;
}
