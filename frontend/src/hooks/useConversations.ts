"use client";
// Carrega o inbox e expõe seleção da conversa ativa.
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { Conversation } from "@/types";

type ConversationPage = { items: Conversation[]; total: number; page: number; pages: number };
export type ConversationFilter = "all" | "urgent" | "normal";

export function useConversations(ownerId?: string) {
  const [activeId, setActiveId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const deferredSearch = useDeferredValue(search.trim());
  const lastVersion = useRef<string | null>(null);
  const versionEndpoint = ownerId ? `/api/conversations/version?ownerId=${encodeURIComponent(ownerId)}` : "/api/conversations/version";
  const fetcher = async <T,>(url: string) => { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error("Falha ao carregar conversas."); return response.json() as Promise<T>; };
  const getKey = (pageIndex: number, previous: ConversationPage | null) => {
    if (previous && pageIndex >= previous.pages) return null;
    const params = new URLSearchParams({ page: String(pageIndex + 1), limit: "100", priority: filter });
    if (ownerId) params.set("ownerId", ownerId);
    if (deferredSearch) params.set("q", deferredSearch);
    return `/api/conversations?${params.toString()}`;
  };
  const { data: pages, isLoading, isValidating, mutate, setSize, size } = useSWRInfinite<ConversationPage>(getKey, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    persistSize: false,
  });
  const data = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const total = pages?.[0]?.total ?? 0;
  const hasMore = Boolean(pages?.length && pages.length < (pages[0]?.pages ?? 0));
  const loadingMore = isValidating && size > 1 && !pages?.[size - 1];
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
      const body = await response.json().catch(() => ({})) as { imported?: number; chats?: number; directory?: { contacts?: number; created?: number }; error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao sincronizar o WhatsApp.");
      const contacts = body.directory?.contacts ?? 0;
      setSyncStatus(contacts ? `${contacts} contatos sincronizados` : body.imported ? `${body.imported} mensagens importadas` : `${body.chats ?? 0} conversas atualizadas`);
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
  useEffect(() => { setActiveId(""); void setSize(1); }, [deferredSearch, filter, ownerId, setSize]);
  useEffect(()=>{if(!activeId&&data[0])setActiveId(data[0].id)},[activeId,data]);
  return {
    data,
    total,
    hasMore,
    loadMore: () => setSize((current) => current + 1),
    loadingMore,
    search,
    setSearch,
    filter,
    setFilter,
    active: data.find((item) => item.id === activeId) ?? data[0],
    setActiveId,
    loading:isLoading,
    mutate,
    syncing,
    syncStatus,
    syncWhatsApp,
  };
}
