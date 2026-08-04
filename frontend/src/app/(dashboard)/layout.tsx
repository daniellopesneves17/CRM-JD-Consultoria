// Estrutura compartilhada das páginas autenticadas.
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { redirect } from "next/navigation";
import { auth } from "@/auth-session";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.crmEnabled) redirect("/login?blocked=1");
  return <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950"><Sidebar/><div className="md:pl-64"><Header/><main className="mx-auto w-full max-w-[1600px] p-5 md:p-8 lg:p-10">{children}</main></div></div>;
}
