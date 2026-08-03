// Página apresentada aos corretores quando o administrador pausa o CRM.
import { Wrench } from "lucide-react";
import { readAdminStore } from "@/lib/admin-store";

async function maintenanceMessage() {
  if (process.env.NODE_ENV !== "production") return (await readAdminStore()).settings.maintenanceMessage;
  try {
    const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
    if (!backendUrl) throw new Error("BACKEND_URL ausente");
    const response = await fetch(`${backendUrl}/system/settings`, { cache: "no-store" });
    if (!response.ok) throw new Error("API indisponível");
    const settings = await response.json() as { maintenanceMessage: string };
    return settings.maintenanceMessage;
  } catch {
    return "CRM temporariamente indisponível para atualização.";
  }
}

export default async function MaintenancePage(){const message=await maintenanceMessage();return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white"><div className="max-w-md text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-400"><Wrench/></span><h1 className="mt-6 text-3xl font-semibold">CRM em manutenção</h1><p className="mt-3 leading-7 text-slate-400">{message}</p></div></main>}
