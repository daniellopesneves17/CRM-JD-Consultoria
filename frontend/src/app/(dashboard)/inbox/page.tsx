"use client";

// Inbox responsivo: lista e conversa ocupam somente a área útil da tela.
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { useConversations } from "@/hooks/useConversations";

export default function InboxPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const { data: crmData } = useSWR<{ users: Array<{ id: string; name: string; email: string; active: boolean; crmEnabled: boolean }> }>(isAdmin ? "/api/admin/crm" : null, async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Falha ao carregar os CRMs."); return response.json(); });
  const ownerId = isAdmin ? selectedOwnerId : undefined;
  const { data, active, setActiveId, mutate, syncing, syncStatus, syncWhatsApp } = useConversations(ownerId);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  function selectConversation(id: string) { setActiveId(id); setMobileChatOpen(true); }
  if (isAdmin && !selectedOwnerId) return <section className="flex h-full min-h-0 items-center justify-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950"><div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"><ShieldCheck size={21}/></span><div><h1 className="text-xl font-semibold text-slate-900 dark:text-white">Selecione um CRM</h1><p className="mt-1 text-sm leading-6 text-slate-500">O Inbox administrativo é separado. Escolha o corretor para abrir apenas o WhatsApp daquele CRM.</p></div></div><div className="mt-6 grid gap-3">{crmData?.users.filter((user) => user.active && user.crmEnabled).map((user) => <button key={user.id} type="button" onClick={() => setSelectedOwnerId(user.id)} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:bg-slate-800"><span><strong className="block text-sm text-slate-900 dark:text-white">{user.name}</strong><span className="text-xs text-slate-500">{user.email}</span></span><span className="text-xs font-semibold text-brand-700 dark:text-brand-300">Abrir CRM →</span></button>)}{crmData && !crmData.users.some((user) => user.active && user.crmEnabled) && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950">Nenhum CRM de corretor está habilitado.</p>}</div></div></section>;
  return <div className="flex h-full min-h-0 overflow-hidden border-t border-slate-200 dark:border-slate-800">
    <ConversationList items={data} activeId={active?.id} onSelect={selectConversation} onSync={syncWhatsApp} syncing={syncing} syncStatus={syncStatus} className={mobileChatOpen ? "hidden lg:flex" : "flex"}/>
    <ChatWindow conversation={active} ownerId={ownerId} onChanged={() => void mutate()} onBack={() => setMobileChatOpen(false)} className={mobileChatOpen ? "flex" : "hidden lg:flex"}/>
  </div>;
}
