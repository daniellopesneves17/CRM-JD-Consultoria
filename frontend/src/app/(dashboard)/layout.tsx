// Estrutura compartilhada das páginas autenticadas.
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { readAdminStore } from "@/lib/admin-store";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session=await getServerSession(authOptions);
  const token=(session as typeof session&{accessToken?:string}|null)?.accessToken;
  if(token==="local-only"&&session?.user?.email){
    const store=await readAdminStore();const account=store.accounts.find(item=>item.email.toLowerCase()===session.user?.email?.toLowerCase());
    if(!account||!account.active||!account.crmEnabled)redirect("/login?blocked=1");
    if(!store.settings.crmEnabled&&account.role!=="ADMIN")redirect("/maintenance");
  }
  return <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950"><Sidebar/><div className="md:pl-64"><Header/><main className="mx-auto w-full max-w-[1600px] p-5 md:p-8 lg:p-10">{children}</main></div></div>;
}
