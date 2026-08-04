// Estrutura compartilhada das páginas autenticadas.
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950"><Sidebar/><div className="md:pl-64"><Header/><main className="mx-auto w-full max-w-[1600px] p-5 md:p-8 lg:p-10">{children}</main></div></div>;
}
