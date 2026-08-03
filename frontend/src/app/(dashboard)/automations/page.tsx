"use client";
// Configuração visual das automações de pré-atendimento, follow-up e reativação.
import { useState } from "react";
import { Clock3, MessageSquareText, Plus, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
const initial: Array<{name:string;description:string;delay:string;active:boolean;icon:typeof Clock3}>=[];
export default function AutomationsPage(){const [rules,setRules]=useState(initial);return <><div className="flex items-end justify-between"><div><p className="label">Fluxos inteligentes</p><h1 className="mt-1 text-3xl font-semibold">Automações</h1><p className="mt-1 text-sm text-slate-500">Mantenha o relacionamento ativo sem perder o toque humano.</p></div><Button><Plus size={17}/>Nova regra</Button></div>
<div className="mt-7"><Card className="p-6"><div className="py-12 text-center"><h2 className="font-semibold">Nenhuma automação configurada</h2><p className="mt-1 text-sm text-slate-500">Crie uma regra quando a operação estiver pronta.</p></div></Card></div></>;}
