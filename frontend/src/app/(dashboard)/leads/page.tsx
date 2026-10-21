"use client";

import { FormEvent, useState } from "react";
import { Download, Plus, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { LeadExportDialog } from "@/components/leads/LeadExportDialog";
import { LeadsTable } from "@/components/pipeline/LeadsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLeads } from "@/hooks/useLeads";

type ExportMode = "mine" | "broker" | "all";

export default function LeadsPage() {
  const { data, mutate } = useLeads();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [creating, setCreating] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("mine");

  function openExport(mode: ExportMode) {
    setExportMode(mode);
    setExportOpen(true);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        livesCount: Number(form.get("livesCount") || 1),
        source: "FORMULARIO",
      }),
    });
    if (response.ok) {
      setCreating(false);
      mutate();
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label">Base de relacionamento</p>
          <h1 className="mt-1 text-3xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">Todos os contatos e oportunidades da corretora.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openExport("mine")}>
            <Download size={17} />Exportar minha carteira
          </Button>
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => openExport("broker")}>
                <Users size={17} />Exportar carteira de um corretor
              </Button>
              <Button variant="secondary" onClick={() => openExport("all")}>
                <Download size={17} />Exportar todas as carteiras
              </Button>
            </>
          )}
          <Button onClick={() => setCreating((value) => !value)}><Plus size={17} />Novo lead</Button>
        </div>
      </div>

      {creating && (
        <Card className="mt-6 p-6">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-medium">Nome<input name="name" minLength={2} required className="mt-2 h-10 w-full rounded border px-3" /></label>
            <label className="text-sm font-medium">WhatsApp<input name="phone" required className="mt-2 h-10 w-full rounded border px-3" placeholder="(22) 99999-9999" /></label>
            <label className="text-sm font-medium">E-mail<input name="email" type="email" className="mt-2 h-10 w-full rounded border px-3" /></label>
            <label className="text-sm font-medium">Vidas<input name="livesCount" type="number" min="1" defaultValue="1" className="mt-2 h-10 w-full rounded border px-3" /></label>
            <div className="flex gap-2 md:col-span-4">
              <Button>Cadastrar</Button>
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-7"><LeadsTable leads={data} /></div>
      <LeadExportDialog open={exportOpen} onOpenChange={setExportOpen} initialMode={exportMode} />
    </>
  );
}
