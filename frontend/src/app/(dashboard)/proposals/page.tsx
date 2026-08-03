"use client";
// Gestão de cotações, status e download de propostas em PDF.
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
export default function ProposalsPage(){return <><div className="flex items-end justify-between gap-4"><div><p className="label">Cotações comerciais</p><h1 className="mt-1 text-3xl font-semibold">Propostas</h1><p className="mt-1 text-sm text-slate-500">Crie, envie e acompanhe cada proposta.</p></div><Button><FilePlus2 size={17}/>Nova proposta</Button></div>
<Card className="mt-7 p-6"><EmptyState title="Nenhuma proposta criada" text="As propostas cadastradas aparecerão aqui."/></Card></>;}
