"use client";
// Inbox unificado em split view para operação de WhatsApp.
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { useConversations } from "@/hooks/useConversations";
export default function InboxPage(){const {data,active,setActiveId,mutate}=useConversations();return <div className="-m-5 md:-m-8"><div className="flex h-[calc(100vh-5rem)] min-h-[620px] overflow-hidden border-t border-slate-200"><ConversationList items={data} activeId={active?.id} onSelect={setActiveId}/><ChatWindow conversation={active} onChanged={()=>mutate()}/></div></div>;}
