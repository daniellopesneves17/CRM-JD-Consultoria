// Pipeline parametrizado com paginação, filtros e revalidação SWR.
import useSWR from "swr";
import type { Lead } from "@/types";
export function usePipeline(query = "limit=25&orderBy=score&order=desc") {
  const { data, error, isLoading, mutate } = useSWR<{ leads: Lead[]; total: number; page: number; totalPages: number }>(`/api/pipeline/leads?${query}`, async (url: string) => { const response=await fetch(url); const body=await response.json(); if(!response.ok)throw new Error(body.error); return body; });
  return { data: data ?? { leads: [], total: 0, page: 1, totalPages: 0 }, error, isLoading, mutate };
}

