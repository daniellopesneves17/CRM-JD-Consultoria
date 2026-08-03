"use client";
// Carrega leads com cache SWR e revalidação automática após alterações.
import useSWR from "swr";
import { Lead } from "@/types";
export function useLeads() {
  const { data, error, isLoading, mutate } = useSWR<{ items: Lead[] }>("/api/pipeline/leads?limit=100", async (url: string) => { const response=await fetch(url); const body=await response.json(); if(!response.ok) throw new Error(body.error); return body; }, { refreshInterval: 30_000 });
  return { data: data?.items ?? [], loading: isLoading, error: error instanceof Error ? error.message : "", mutate };
}
