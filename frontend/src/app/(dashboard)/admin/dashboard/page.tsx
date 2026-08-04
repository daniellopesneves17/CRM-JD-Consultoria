"use client";
// Visão executiva do administrador com KPIs, meta, equipe e ranking real.
import useSWR from "swr";
import { Target, TrendingUp, UserPlus, Users } from "lucide-react";
import { KpiCardLarge } from "@/components/admin/KpiCardLarge";
import { MedalRanking } from "@/components/admin/MedalRanking";
import { TeamRankingTable, TeamMember } from "@/components/admin/TeamRankingTable";
import { GoalMeter } from "@/components/goals/GoalMeter";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/utils";
import type { GoalStatus } from "@/types";

const fetcher=async(url:string)=>{const response=await fetch(url);if(response.status===404)return null;if(!response.ok)throw new Error("Falha ao carregar dados administrativos.");return response.json()};
type Overview={mrr:{value:number;variation:number};activeLives:{value:number;variation:number};leadsThisMonth:{value:number;variation:number};conversionRate:{value:number;variation:number}};
type Team={users:TeamMember[];ranking:Array<TeamMember&{revenueVariation:number}>};
type Goal={targetValue:number|string;currentValue:number|string;status:GoalStatus};

export default function AdminDashboardPage(){const{data:overview,error}=useSWR<Overview>("/api/admin/overview",fetcher,{refreshInterval:30_000});const{data:team}=useSWR<Team>("/api/admin/team",fetcher,{refreshInterval:30_000});const{data:goal}=useSWR<Goal|null>("/api/goals/current",fetcher,{refreshInterval:30_000});return <><div><p className="label">Visão executiva</p><h2 className="mt-1 text-3xl font-semibold">Resultado da operação</h2><p className="mt-2 text-sm text-slate-500">Indicadores consolidados e atualizados automaticamente.</p></div>{error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Não foi possível carregar os indicadores.</div>}{overview?<div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCardLarge icon={TrendingUp} title="MRR" value={money(overview.mrr.value)} variation={overview.mrr.variation}/><KpiCardLarge icon={Users} title="Vidas ativas" value={`${overview.activeLives.value} vidas`} variation={overview.activeLives.variation}/><KpiCardLarge icon={UserPlus} title="Leads este mês" value={`${overview.leadsThisMonth.value} leads`} variation={overview.leadsThisMonth.variation}/><KpiCardLarge icon={Target} title="Taxa de fechamento" value={`${overview.conversionRate.value.toFixed(1)}%`} variation={overview.conversionRate.variation}/></div>:<div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4},(_,index)=><Skeleton key={index} className="h-44"/>)}</div>}<Card className="mt-7 p-6 md:p-8"><div className="mb-6"><p className="label">Meta do mês</p><h3 className="mt-1 text-xl font-semibold">Ritmo comercial</h3></div>{goal?<GoalMeter current={Number(goal.currentValue)} target={Number(goal.targetValue)} {...goal.status}/>:<EmptyState title="Meta ainda não configurada" text="Defina a meta mensal para acompanhar ritmo e projeção."/>}</Card><Card className="mt-7 overflow-hidden"><div className="border-b p-5"><h3 className="text-lg font-semibold">Desempenho da equipe</h3><p className="text-sm text-slate-500">Leads, receita, meta, conversão e tempo de resposta.</p></div>{team?<TeamRankingTable users={team.users}/>:<Skeleton className="m-5 h-64"/>}</Card><div className="mt-7"><div className="mb-4"><h3 className="text-lg font-semibold">Ranking mensal</h3><p className="text-sm text-slate-500">Top 3 por receita fechada no mês.</p></div>{team?.ranking.length?<MedalRanking items={team.ranking}/>:<EmptyState title="Ranking sem dados" text="Os resultados aparecem após os primeiros fechamentos do mês."/>}</div></>}
