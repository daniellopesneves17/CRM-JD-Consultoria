// Estrutura compartilhada das páginas autenticadas.
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { active: true, crmEnabled: true, role: true } }),
    prisma.systemSettings.findUnique({ where: { id: "global" }, select: { crmEnabled: true } })
  ]);
  if (!user?.active || !user.crmEnabled) redirect("/login?blocked=1");
  if (settings && !settings.crmEnabled && user.role !== "ADMIN") redirect("/maintenance");
  return <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950"><Sidebar/><div className="md:pl-64"><Header/><main className="mx-auto w-full max-w-[1600px] p-5 md:p-8 lg:p-10">{children}</main></div></div>;
}
