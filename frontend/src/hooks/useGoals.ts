"use client";
// Consulta a meta atual sem inventar valores quando a API não está conectada.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GoalStatus } from "@/types";
type Goal = { targetValue: number | string; currentValue: number | string; status: GoalStatus };
export function useGoals() {
  const [data, setData] = useState<Goal | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api<Goal>("/goals/current").then(setData).catch(() => undefined).finally(() => setLoading(false)); }, []);
  return { data, loading };
}
