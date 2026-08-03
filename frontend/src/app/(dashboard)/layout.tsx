// Estrutura compartilhada das páginas autenticadas.
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getBackendUrl } from "@/lib/backend-url";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session=await getServerSession(authOptions);
  const token=(session as typeof session&{accessToken?:string}|null)?.accessToken;
  if (!token) redirect("/login");

  let access: Response;
  try {
    access = await fetch(`${getBackendUrl()}/auth/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    redirect("/login?unavailable=1");
  }

  if (access.status === 403) redirect("/maintenance");
  if (!access.ok) redirect("/login?blocked=1");
  return <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950"><Sidebar/><div className="md:pl-64"><Header/><main className="mx-auto w-full max-w-[1600px] p-5 md:p-8 lg:p-10">{children}</main></div></div>;
}
