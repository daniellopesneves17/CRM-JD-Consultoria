"use client";
// Obtém KPIs do período selecionado.
import useSWR from "swr";
export type Metrics = { leads:number; qualificationRate:number; closingRate:number; averageTicket:number; revenue:number; activeLives:number; churnRate:number; averageClosingDays:number;conversationsToday:number;proposalsOpen:number };
const empty: Metrics = { leads:0,qualificationRate:0,closingRate:0,averageTicket:0,revenue:0,activeLives:0,churnRate:0,averageClosingDays:0,conversationsToday:0,proposalsOpen:0 };
export function useMetrics(days = 30) {
  const {data,isLoading,error}=useSWR<Metrics>(`/api/metrics/overview?days=${days}`,async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error("Falha ao carregar métricas.");return response.json();},{refreshInterval:30_000});
  return { data:data??empty, loading:isLoading,error };
}
