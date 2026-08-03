"use client";
// Chat ativo com transferência ao humano, sugestão da IA e envio de texto.
import { FormEvent, useState } from "react";
import { Send, UserRoundCheck } from "lucide-react";
import { Conversation } from "@/types";
import { Button } from "@/components/ui/Button";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { MessageBubble } from "./MessageBubble";
export function ChatWindow({conversation}:{conversation?:Conversation}){const [text,setText]=useState("");if(!conversation)return <div className="grid flex-1 place-items-center text-center text-sm text-slate-400"><div><p className="font-medium text-slate-600">Nenhuma conversa</p><p className="mt-1">As conversas aparecerão quando uma fonte de mensagens for configurada.</p></div></div>;
function submit(e:FormEvent){e.preventDefault();if(!text.trim())return;setText("");}
return <section className="flex min-w-0 flex-1 flex-col bg-slate-50"><header className="flex flex-wrap items-center gap-3 border-b bg-white px-5 py-4"><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-semibold">{conversation.lead.name}</h2><TemperatureBadge value={conversation.lead.temperature}/></div><p className="mt-1 text-xs text-slate-500">{conversation.lead.stage.replaceAll("_"," ").toLowerCase()} • {conversation.status==="BOT"?"IA atendendo":"Corretor atendendo"}</p></div><Button variant="secondary" size="sm"><UserRoundCheck size={16}/>Assumir conversa</Button><Button variant="ghost" size="sm">Ver perfil completo</Button></header>
<div className="scrollbar flex-1 space-y-4 overflow-y-auto p-5 md:p-7"><div className="mx-auto max-w-2xl space-y-4">{conversation.messages.map(m=><MessageBubble key={m.id} message={m}/>)}</div></div>
<form onSubmit={submit} className="border-t bg-white p-4"><div className="mx-auto flex max-w-3xl items-end gap-2"><textarea rows={1} value={text} onChange={e=>setText(e.target.value)} className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder="Digite uma mensagem..."/><Button className="h-11 w-11 p-0" aria-label="Enviar"><Send size={18}/></Button></div></form></section>;}
