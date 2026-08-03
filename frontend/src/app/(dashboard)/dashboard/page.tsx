"use client";
// Visão geral executiva com desempenho, agenda e oportunidades prioritárias.
import { BadgeDollarSign, Clock3, MessageSquare, Target, Users } from "lucide-react";
import { KpiCard } from "@/components/metrics/KpiCard";
import { Card } from "@/components/ui/Card";
import { GoalMeter } from "@/components/goals/GoalMeter";
import { useGoals } from "@/hooks/useGoals";
import { useLeads } from "@/hooks/useLeads";
import { money } from "@/lib/utils";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMetrics } from "@/hooks/useMetrics";
export default function DashboardPage(){
 const {data:goal}=useGoals();const {data:leads}=useLeads();const {data:metrics}=useMetrics();
 const today=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"}).format(new Date());
 return <><div className="flex items-end justify-between"><div><p className="label">Visão geral</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Os indicadores serão preenchidos quando as fontes forem conectadas.</p></div><p className="hidden capitalize text-sm text-slate-500 sm:block">{today}</p></div>
 <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Leads ativos" value={String(metrics.leads)} icon={Users}/><KpiCard label="Conversas hoje" value="0" icon={MessageSquare}/><KpiCard label="Propostas abertas" value="0" icon={Clock3}/><KpiCard label="Receita do mês" value={money(metrics.revenue)} icon={BadgeDollarSign}/></div>
 <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><Card className="p-6"><div className="mb-6 flex items-center justify-between"><div><p className="label">Meta atual</p><h2 className="mt-1 text-xl font-semibold">Ritmo comercial</h2></div><Target className="text-brand-600"/></div>{goal?<GoalMeter current={Number(goal.currentValue)} target={Number(goal.targetValue)} {...goal.status}/>:<EmptyState title="Nenhuma meta configurada" text="Crie a primeira meta para começar a acompanhar o progresso comercial."/>}</Card>
 <Card className="p-6"><div><p className="label">Prioridades</p><h2 className="mt-1 text-xl font-semibold">Leads prioritários</h2></div>{leads.length?<div className="mt-4 divide-y divide-slate-100">{leads.slice(0,4).map((lead)=><div key={lead.id} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold">{lead.name.split(" ").map(w=>w[0]).slice(0,2)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{lead.name}</strong><span className="text-xs text-slate-500">{money(Number(lead.estimatedValue||0))} • score {lead.score}</span></span><TemperatureBadge value={lead.temperature}/></div>)}</div>:<EmptyState title="Nenhum lead cadastrado" text="Os leads aparecerão aqui depois da primeira entrada ou importação."/>}</Card></div></>;
}
