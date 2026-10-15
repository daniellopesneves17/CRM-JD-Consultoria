"use client";
// Carrega o inbox e expõe seleção da conversa ativa.
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Conversation } from "@/types";
export function useConversations(ownerId?: string) {
  const [activeId, setActiveId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const attemptedInitialSync = useRef(false);
  const lastVersion = useRef<string | null>(null);
  const endpoint = ownerId ? `/api/conversations?ownerId=${encodeURIComponent(ownerId)}` : "/api/conversations";
  const versionEndpoint = ownerId ? `/api/conversations/version?ownerId=${encodeURIComponent(ownerId)}` : "/api/conversations/version";
  const fetcher = async <T,>(url: string) => { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error("Falha ao carregar conversas."); return response.json() as Promise<T>; };
  const {data=[],isLoading,mutate}=useSWR<Conversation[]>(endpoint,fetcher,{refreshInterval:0,revalidateOnFocus:true,revalidateOnReconnect:true});
  const { data: versionData } = useSWR<{ version: string }>(versionEndpoint, fetcher, {
    refreshInterval: () => typeof document !== "undefined" && document.visibilityState === "visible" ? 1_000 : 0,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    dedupingInterval: 500,
  });
  const syncWhatsApp = useCallback(async () => {
    setSyncing(true);
    setSyncStatus("");
    try {
      const response = await fetch(`/api/uazapi/sync${ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : ""}`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { imported?: number; chats?: number; error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao sincronizar o WhatsApp.");
      setSyncStatus(body.imported ? `${body.imported} mensagens importadas` : `${body.chats ?? 0} conversas atualizadas`);
      await mutate();
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Falha ao sincronizar o WhatsApp.");
    } finally {
      setSyncing(false);
    }
  }, [mutate, ownerId]);
  useEffect(() => {
    const version = versionData?.version;
    if (!version) return;
    if (lastVersion.current && lastVersion.current !== version) void mutate();
    lastVersion.current = version;
  }, [mutate, versionData?.version]);
  useEffect(()=>{if(!activeId&&data[0])setActiveId(data[0].id)},[activeId,data]);
  useEffect(() => {
    if (ownerId && !isLoading && !attemptedInitialSync.current) {
      attemptedInitialSync.current = true;
      void syncWhatsApp();
    }
  }, [data.length, isLoading, ownerId, syncWhatsApp]);
  return { data, active: data.find((item) => item.id === activeId) ?? data[0], setActiveId, loading:isLoading, mutate, syncing, syncStatus, syncWhatsApp };
}
