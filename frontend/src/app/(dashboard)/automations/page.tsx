"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { LoaderCircle, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type Rule = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  delayHours: number;
  template: string;
  active: boolean;
  globalActive: boolean;
  customized: boolean;
};
type AutomationResponse = { automations: Rule[]; canCreate: boolean };

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar automações.");
  return response.json() as Promise<AutomationResponse>;
};

export default function AutomationsPage() {
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data, error, mutate } = useSWR<AutomationResponse>("/api/automations", fetcher);
  const rules = data?.automations ?? [];

  async function toggle(rule: Rule) {
    setSavingId(rule.id);
    setNotice(null);
    try {
      const response = await fetch("/api/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Não foi possível alterar a automação.");
      await mutate();
      setNotice(`${rule.name} foi ${rule.active ? "pausada" : "ativada"} no seu CRM.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Não foi possível alterar a automação.");
    } finally {
      setSavingId(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        trigger: form.get("trigger"),
        delayHours: Number(form.get("delayHours")),
        template: form.get("template"),
        active: true,
      }),
    });
    if (response.ok) {
      setCreating(false);
      await mutate();
    }
  }

  return <>
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="label">Fluxos inteligentes</p>
        <h1 className="mt-1 text-3xl font-semibold">Automações</h1>
        <p className="mt-1 text-sm text-slate-500">Ative ou pause rotinas somente para a sua própria carteira.</p>
      </div>
      {data?.canCreate && <Button onClick={() => setCreating((value) => !value)}><Plus size={17}/>Nova regra</Button>}
    </div>

    {notice && <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">{notice}</div>}
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível carregar as automações.</div>}

    {creating && <Card className="mt-6 p-6">
      <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Nome<input name="name" required minLength={3} className="input mt-2"/></label>
        <label className="text-sm font-medium">Gatilho<select name="trigger" className="input mt-2"><option value="proposal_sent_no_response">Proposta sem resposta</option><option value="cold_lead">Lead frio</option></select></label>
        <label className="text-sm font-medium">Espera em horas<input name="delayHours" type="number" min="1" defaultValue="24" className="input mt-2"/></label>
        <label className="text-sm font-medium md:col-span-2">Orientação para a IA<textarea name="template" required rows={3} className="input mt-2 h-auto p-3" placeholder="Retome o principal benefício da proposta sem pressionar."/></label>
        <div className="flex gap-2"><Button>Salvar regra</Button><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button></div>
      </form>
    </Card>}

    <div className="mt-7 space-y-3">
      {!data ? Array.from({ length: 4 }, (_, index) => <Card key={index} className="h-24 animate-pulse bg-slate-100 dark:bg-slate-900"/>) : rules.length ? rules.map((rule) => <Card key={rule.id} className="flex items-center gap-4 p-5">
        <span className={`grid h-10 w-10 place-items-center rounded ${rule.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><Zap size={18}/></span>
        <div className="min-w-0 flex-1">
          <strong className="text-sm">{rule.name}</strong>
          <p className="mt-1 text-xs text-slate-500">{rule.description || rule.trigger.replaceAll("_", " ")} • após {rule.delayHours}h</p>
          {!data.canCreate && <p className="mt-1 text-[11px] text-slate-400">{rule.customized ? "Configuração própria deste CRM" : "Usando o padrão da operação"}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden rounded px-2 py-1 text-xs font-semibold sm:inline ${rule.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{rule.active ? "Ativa" : "Pausada"}</span>
          <button
            type="button"
            role="switch"
            aria-label={`${rule.active ? "Pausar" : "Ativar"} ${rule.name}`}
            aria-checked={rule.active}
            disabled={savingId === rule.id}
            onClick={() => void toggle(rule)}
            className={`relative h-7 w-12 rounded-full transition ${rule.active ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            {savingId === rule.id
              ? <LoaderCircle className="absolute left-3.5 top-1.5 animate-spin text-white" size={16}/>
              : <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${rule.active ? "left-6" : "left-1"}`}/>
            }
          </button>
        </div>
      </Card>) : <Card className="p-6"><EmptyState title="Nenhuma automação configurada" text="O administrador ainda não cadastrou regras para a operação."/></Card>}
    </div>
  </>;
}
