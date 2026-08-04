"use client";
// Shell exclusivo do painel admin; o proxy faz o bloqueio primário e este guard evita renderização indevida no cliente.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLayout({children}:{children:React.ReactNode}) {
  const {data,status}=useSession(); const router=useRouter();
  useEffect(()=>{if(status==="unauthenticated"||status==="authenticated"&&data?.user?.role!=="ADMIN")router.replace("/dashboard")},[status,data,router]);
  if(status==="loading")return <div className="p-8"><Skeleton className="h-16 w-full"/><Skeleton className="mt-6 h-96 w-full"/></div>;
  if(data?.user?.role!=="ADMIN")return null;
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><AdminSidebar/><div className="lg:pl-72"><header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b bg-white/90 px-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-8"><div><h1 className="text-lg font-semibold">Painel Administrativo</h1><p className="text-xs text-slate-500">{data.user.name||data.user.email}</p></div><span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"><ShieldCheck size={13}/>ADMIN</span><ThemeToggle/></header><main className="mx-auto w-full max-w-[1680px] p-5 md:p-8 lg:p-10">{children}</main></div></div>;
}
