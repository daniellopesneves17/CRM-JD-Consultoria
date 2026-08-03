"use client";
// Obtém KPIs do período selecionado.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export type Metrics = { leads:number; qualificationRate:number; closingRate:number; averageTicket:number; revenue:number; activeLives:number; churnRate:number; averageClosingDays:number };
const empty: Metrics = { leads:0,qualificationRate:0,closingRate:0,averageTicket:0,revenue:0,activeLives:0,churnRate:0,averageClosingDays:0 };
export function useMetrics(days = 30) {
  const [data, setData] = useState(empty); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api<Metrics>(`/metrics/overview?days=${days}`).then(setData).catch(() => undefined).finally(() => setLoading(false)); }, [days]);
  return { data, loading };
}
