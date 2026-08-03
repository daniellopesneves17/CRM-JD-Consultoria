"use client";
// Painel lateral com visão integral do lead e abas operacionais.
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { X, Mail, Phone, Sparkles } from "lucide-react";
import { Lead } from "@/types";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { ScoreBadge } from "./ScoreBadge";
import { Button } from "@/components/ui/Button";
import { money } from "@/lib/utils";
export function LeadDrawer({lead,open,onOpenChange}:{lead?:Lead;open:boolean;onOpenChange:(value:boolean)=>void}){
 if(!lead)return null; const tabs=["Visão geral","Conversas","Propostas","Tarefas","Atividades"];
 return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30"/><Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
 <div className="sticky top-0 border-b border-slate-200 bg-white p-6"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{lead.name.split(" ").map(w=>w[0]).slice(0,2)}</span><div className="flex-1"><Dialog.Title className="text-xl font-semibold">{lead.name}</Dialog.Title><div className="mt-1 flex items-center gap-2"><TemperatureBadge value={lead.temperature}/><span className="text-xs text-slate-500">{lead.livesCount} vidas</span></div></div><Dialog.Close className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar"><X/></Dialog.Close></div></div>
 <Tabs.Root defaultValue="Visão geral"><Tabs.List className="scrollbar flex overflow-x-auto border-b border-slate-200 px-6">{tabs.map(tab=><Tabs.Trigger key={tab} value={tab} className="whitespace-nowrap border-b-2 border-transparent px-3 py-4 text-sm text-slate-500 data-[state=active]:border-brand-600 data-[state=active]:font-semibold data-[state=active]:text-brand-600">{tab}</Tabs.Trigger>)}</Tabs.List>
 <Tabs.Content value="Visão geral" className="space-y-6 p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border p-4"><p className="label">Score IA</p><div className="mt-3"><ScoreBadge score={lead.score}/></div></div><div className="rounded-lg border p-4"><p className="label">Valor estimado</p><p className="mt-2 text-xl font-semibold">{money(Number(lead.estimatedValue||0))}</p></div></div>
 <div><h3 className="font-semibold">Contato</h3><p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Phone size={16}/>{lead.phone}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Mail size={16}/>{lead.email||"E-mail não informado"}</p></div>
 {lead.notes&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="font-semibold text-slate-900">Observações</div><p className="mt-2 text-sm leading-6 text-slate-600">{lead.notes}</p></div>}
 <Button className="w-full">Abrir conversa no WhatsApp</Button></Tabs.Content>
 <Tabs.Content value="Conversas" className="p-6 text-sm text-slate-500">Nenhuma conversa registrada.</Tabs.Content><Tabs.Content value="Propostas" className="p-6 text-sm text-slate-500">Nenhuma proposta registrada.</Tabs.Content><Tabs.Content value="Tarefas" className="p-6"><Button size="sm">Criar nova tarefa</Button><div className="mt-4 rounded-lg border p-4 text-sm">{lead.tasks?.[0]?.title||"Nenhuma tarefa pendente"}</div></Tabs.Content><Tabs.Content value="Atividades" className="p-6 text-sm text-slate-500">Nenhuma atividade registrada.</Tabs.Content></Tabs.Root>
 </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
