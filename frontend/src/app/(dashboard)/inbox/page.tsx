"use client";

// Inbox responsivo: lista e conversa ocupam somente a área útil da tela.
import { useState } from "react";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { useConversations } from "@/hooks/useConversations";

export default function InboxPage() {
  const { data, active, setActiveId, mutate, syncing, syncStatus, syncWhatsApp } = useConversations();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  function selectConversation(id: string) { setActiveId(id); setMobileChatOpen(true); }
  return <div className="flex h-full min-h-0 overflow-hidden border-t border-slate-200 dark:border-slate-800">
    <ConversationList items={data} activeId={active?.id} onSelect={selectConversation} onSync={syncWhatsApp} syncing={syncing} syncStatus={syncStatus} className={mobileChatOpen ? "hidden lg:flex" : "flex"}/>
    <ChatWindow conversation={active} onChanged={() => void mutate()} onBack={() => setMobileChatOpen(false)} className={mobileChatOpen ? "flex" : "hidden lg:flex"}/>
  </div>;
}
