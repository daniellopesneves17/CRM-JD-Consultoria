"use client";
// Catálogo de leads; reaproveita a tabela operacional com foco em busca.
import { LeadsTable } from "@/components/pipeline/LeadsTable";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
export default function LeadsPage(){const {data}=useLeads();return <><div className="flex items-end justify-between"><div><p className="label">Base de relacionamento</p><h1 className="mt-1 text-3xl font-semibold">Leads</h1><p className="mt-1 text-sm text-slate-500">Todos os contatos e oportunidades da corretora.</p></div><Button><Plus size={17}/>Novo lead</Button></div><div className="mt-7"><LeadsTable leads={data}/></div></>;}

