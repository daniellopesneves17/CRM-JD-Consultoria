"use client";
// Consulta a meta atual sem inventar valores quando a API não está conectada.
import useSWR from "swr";
import { GoalStatus } from "@/types";
type Goal = { targetValue: number | string; currentValue: number | string; status: GoalStatus };
export function useGoals() {
  const {data,error,isLoading,mutate}=useSWR<Goal|null>("/api/goals/current",async(url:string)=>{const response=await fetch(url);if(response.status===404)return null;if(!response.ok)throw new Error("Falha ao carregar meta.");return response.json();});
  return { data:data??null, loading:isLoading, error, mutate };
}
