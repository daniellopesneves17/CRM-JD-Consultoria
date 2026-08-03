"use client";
// Perfil individual carregado somente a partir da API real.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Lead } from "@/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { money } from "@/lib/utils";
export default function LeadPage({params}:{params:{id:string}}){
  const [lead,setLead]=useState<Lead|null>(null);
  useEffect(()=>{api<Lead>(`/leads/${params.id}`).then(setLead).catch(()=>setLead(null));},[params.id]);
  return <><Link href="/leads" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>Voltar para leads</Link>{lead?<Card className="mt-5 p-7"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{lead.name.split(" ").map(w=>w[0]).slice(0,2)}</span><div><h1 className="text-2xl font-semibold">{lead.name}</h1><div className="mt-1 flex gap-2"><TemperatureBadge value={lead.temperature}/><span className="text-sm text-slate-500">Score {lead.score}</span></div></div></div><div className="mt-7 grid gap-4 sm:grid-cols-3"><div><p className="label">Telefone</p><p className="mt-1">{lead.phone}</p></div><div><p className="label">Valor estimado</p><p className="mt-1">{money(Number(lead.estimatedValue||0))}</p></div><div><p className="label">Corretor</p><p className="mt-1">{lead.assignedTo?.name||"Não atribuído"}</p></div></div></Card>:<Card className="mt-5 p-6"><EmptyState title="Lead não encontrado" text="Não há dados disponíveis para este registro."/></Card>}</>;
}
