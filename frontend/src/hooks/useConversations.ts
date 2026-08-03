"use client";
// Carrega o inbox e expõe seleção da conversa ativa.
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Conversation } from "@/types";
export function useConversations() {
  const [activeId, setActiveId] = useState("");
  const {data=[],isLoading,mutate}=useSWR<Conversation[]>("/api/conversations",async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error("Falha ao carregar conversas.");return response.json();},{refreshInterval:10_000});
  useEffect(()=>{if(!activeId&&data[0])setActiveId(data[0].id)},[activeId,data]);
  return { data, active: data.find((item) => item.id === activeId) ?? data[0], setActiveId, loading:isLoading, mutate };
}
