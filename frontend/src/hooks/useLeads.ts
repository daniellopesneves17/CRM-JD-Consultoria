"use client";
// Carrega leads da API; sem conexão, preserva o estado vazio real.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Lead } from "@/types";
export function useLeads() {
  const [data, setData] = useState<Lead[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { api<{ items: Lead[] }>("/pipeline/leads?limit=50").then((result) => setData(result.items)).catch((err: Error) => setError(err.message)).finally(() => setLoading(false)); }, []);
  return { data, loading, error };
}
