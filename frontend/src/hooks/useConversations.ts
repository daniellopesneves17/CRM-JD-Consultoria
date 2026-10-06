"use client";
// Carrega o inbox e expõe seleção da conversa ativa.
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Conversation } from "@/types";
export function useConversations() {
  const [activeId, setActiveId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const attemptedInitialSync = useRef(false);
  const {data=[],isLoading,mutate}=useSWR<Conversation[]>("/api/conversations",async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error("Falha ao carregar conversas.");return response.json();},{refreshInterval:10_000});
  const syncWhatsApp = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("");
    try {
      const response = await fetch("/api/uazapi/sync", { method: "POST" });
      const body = await response.json().catch(() => ({})) as { imported?: number; chats?: number; error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao sincronizar o WhatsApp.");
      setSyncStatus(body.imported ? `${body.imported} mensagens importadas` : `${body.chats ?? 0} conversas atualizadas`);
      await mutate();
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Falha ao sincronizar o WhatsApp.");
    } finally {
      setSyncing(false);
    }
  }, [mutate]);
  useEffect(()=>{if(!activeId&&data[0])setActiveId(data[0].id)},[activeId,data]);
  useEffect(() => {
    if (!isLoading && !data.length && !attemptedInitialSync.current) {
      attemptedInitialSync.current = true;
      void syncWhatsApp();
    }
  }, [data.length, isLoading, syncWhatsApp]);
  return { data, active: data.find((item) => item.id === activeId) ?? data[0], setActiveId, loading:isLoading, mutate, syncing, syncStatus, syncWhatsApp };
}
