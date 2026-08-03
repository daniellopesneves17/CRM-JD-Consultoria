// Página apresentada aos corretores quando o administrador pausa o CRM.
import { Wrench } from "lucide-react";
import { readAdminStore } from "@/lib/admin-store";
export default async function MaintenancePage(){const store=await readAdminStore();return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white"><div className="max-w-md text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-400"><Wrench/></span><h1 className="mt-6 text-3xl font-semibold">CRM em manutenção</h1><p className="mt-3 leading-7 text-slate-400">{store.settings.maintenanceMessage}</p></div></main>}
