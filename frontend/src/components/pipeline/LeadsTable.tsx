"use client";
// Tabela ordenável do pipeline com seleção múltipla e abertura do drawer.
import { useMemo, useState } from "react";
import { Lead } from "@/types";
import { LeadRow } from "./LeadRow";
import { LeadDrawer } from "./LeadDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
export function LeadsTable({leads}:{leads:Lead[]}){const [selected,setSelected]=useState<string[]>([]);const [active,setActive]=useState<Lead>();const all=selected.length===leads.length;
const toggle=(id:string)=>setSelected(items=>items.includes(id)?items.filter(item=>item!==id):[...items,id]);
if(!leads.length)return <div className="rounded-xl border border-slate-200 bg-white p-6"><EmptyState title="Nenhum lead cadastrado" text="Os registros aparecerão aqui após o primeiro cadastro ou importação."/></div>;
return <><div className="scrollbar overflow-x-auto rounded-xl border border-slate-200"><table className="w-full border-collapse text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3"><input type="checkbox" checked={all&&leads.length>0} onChange={()=>setSelected(all?[]:leads.map(l=>l.id))} aria-label="Selecionar todos"/></th>{["Lead","Etapa","Score","Temperatura","Valor estimado","Última atividade","Próxima tarefa","Corretor","Ações"].map(h=><th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{leads.map(lead=><LeadRow key={lead.id} lead={lead} selected={selected.includes(lead.id)} onSelect={()=>toggle(lead.id)} onOpen={()=>setActive(lead)}/>)}</tbody></table></div><LeadDrawer lead={active} open={Boolean(active)} onOpenChange={open=>!open&&setActive(undefined)}/></>;}
