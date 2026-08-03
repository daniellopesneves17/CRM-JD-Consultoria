"use client";
// Painel de metas individual, histórico e semáforo da equipe.
import { Card } from "@/components/ui/Card";
import { GoalMeter } from "@/components/goals/GoalMeter";
import { GoalProjection } from "@/components/goals/GoalProjection";
import { useGoals } from "@/hooks/useGoals";
import { money } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
export default function GoalsPage(){const {data}=useGoals();const month=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date());return <><div><p className="label">Performance pessoal</p><h1 className="mt-1 text-3xl font-semibold">Metas</h1><p className="mt-1 capitalize text-sm text-slate-500">{month}</p></div>
<Card className="mt-7 p-6 md:p-8">{data?<GoalMeter current={Number(data.currentValue)} target={Number(data.targetValue)} {...data.status}/>:<EmptyState title="Nenhuma meta configurada" text="Defina uma meta mensal para habilitar progresso, projeção e semáforo."/>}</Card>
<div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><Card className="p-6"><h2 className="text-lg font-semibold">Histórico dos últimos 6 meses</h2><p className="mb-4 text-sm text-slate-500">Meta comparada ao valor realizado</p><EmptyState title="Sem histórico" text="O histórico será formado a partir das metas cadastradas."/></Card><Card className="p-6"><h2 className="text-lg font-semibold">Metas da equipe</h2><EmptyState title="Equipe sem metas" text="As metas dos corretores aparecerão neste painel."/></Card></div></>;}
