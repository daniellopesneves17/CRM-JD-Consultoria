"use client";
// Carrega o inbox e expõe seleção da conversa ativa.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Conversation } from "@/types";
export function useConversations() {
  const [data, setData] = useState<Conversation[]>([]); const [activeId, setActiveId] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { api<Conversation[]>("/conversations").then((items) => { setData(items); if (items[0]) setActiveId(items[0].id); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
  return { data, active: data.find((item) => item.id === activeId) ?? data[0], setActiveId, loading };
}
