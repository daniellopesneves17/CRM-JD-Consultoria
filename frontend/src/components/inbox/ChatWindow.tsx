"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bold, Bot, Code2, Italic, Send, Strikethrough, UserRoundCheck } from "lucide-react";
import type { Conversation } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";
import { AiSuggestion } from "./AiSuggestion";
import { ContactAvatar } from "./ContactAvatar";

const formatActions = [
  { marker: "*", label: "Negrito", icon: Bold },
  { marker: "_", label: "Itálico", icon: Italic },
  { marker: "~", label: "Tachado", icon: Strikethrough },
  { marker: "```", label: "Monoespaçado", icon: Code2 },
] as const;

function sameDay(left: string, right?: string) {
  if (!right) return false;
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export function ChatWindow({ conversation, onChanged, onBack, className }: { conversation?: Conversation; onChanged: () => void; onBack: () => void; className?: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [conversation?.id, conversation?.messages.length]);
  useEffect(() => { setText(""); setError(""); }, [conversation?.id]);

  if (!conversation) return <section className={cn("min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950", className)}><div className="grid flex-1 place-items-center text-center text-sm text-slate-400"><div><p className="font-semibold text-slate-600 dark:text-slate-300">Selecione uma conversa</p><p className="mt-1">Suas mensagens do WhatsApp aparecerão aqui.</p></div></div></section>;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setError("");
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversation!.id, content: text.trim() }) });
    if (response.ok) { setText(""); if (textareaRef.current) textareaRef.current.style.height = "44px"; onChanged(); }
    else { const body = await response.json().catch(() => ({})) as { error?: string }; setError(body.error || "Não foi possível enviar a mensagem."); }
    setSending(false);
  }

  async function takeOver() {
    await fetch(`/api/conversations/${conversation!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "HUMANO" }) });
    onChanged();
  }

  function format(marker: string) {
    const input = textareaRef.current; if (!input) return;
    const start = input.selectionStart; const end = input.selectionEnd;
    const selection = text.slice(start, end) || "texto";
    const next = `${text.slice(0, start)}${marker}${selection}${marker}${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + marker.length, start + marker.length + selection.length); });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); formRef.current?.requestSubmit(); }
  }

  return <section className={cn("min-w-0 flex-1 flex-col overflow-hidden bg-[#efeae2] dark:bg-[#07101f]", className)}>
    <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      <button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Voltar às conversas"><ArrowLeft size={19}/></button>
      <ContactAvatar name={conversation.lead.name} src={conversation.lead.avatarUrl} className="h-10 w-10"/>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{conversation.lead.name}</h2>{conversation.sentiment === "URGENTE" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">Urgente</span>}</div><p className="mt-0.5 truncate text-[11px] text-slate-500">{conversation.lead.phone} · {conversation.status === "BOT" ? "Pré-atendimento da IA" : "Atendimento humano"}</p></div>
      {conversation.status === "BOT" && <Button variant="secondary" size="sm" onClick={takeOver} className="hidden sm:inline-flex"><UserRoundCheck size={15}/>Assumir</Button>}
    </header>
    <div className="scrollbar min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.72),transparent_32%),radial-gradient(circle_at_75%_80%,rgba(219,234,254,.42),transparent_28%)] px-3 py-4 dark:bg-[radial-gradient(circle_at_25%_20%,rgba(30,41,59,.62),transparent_32%),radial-gradient(circle_at_75%_80%,rgba(30,64,175,.12),transparent_28%)] sm:px-5">
      <div className="mx-auto max-w-3xl space-y-2">{conversation.messages.map((message, index) => <div key={message.id}>
        {!sameDay(message.sentAt, conversation.messages[index - 1]?.sentAt) && <div className="my-4 flex justify-center"><span className="rounded-lg bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-sm dark:bg-slate-800/90 dark:text-slate-300">{dayLabel(message.sentAt)}</span></div>}
        <MessageBubble message={message}/>
      </div>)}<div ref={bottomRef}/></div>
    </div>
    <form ref={formRef} onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
      <div className="mx-auto max-w-3xl"><AiSuggestion conversationId={conversation.id} onUse={(value) => { setText(value); requestAnimationFrame(() => textareaRef.current?.focus()); }}/>{error && <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-300">{error}</p>}
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm transition focus-within:border-brand-500 focus-within:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus-within:bg-slate-950">
          <div className="flex shrink-0 items-center gap-0.5 self-end pb-0.5">{formatActions.map(({ marker, label, icon: Icon }) => <button key={label} type="button" onClick={() => format(marker)} title={label} aria-label={label} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><Icon size={15}/></button>)}</div>
          <textarea ref={textareaRef} rows={1} value={text} onChange={(event) => { setText(event.target.value); event.currentTarget.style.height = "44px"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`; }} onKeyDown={onKeyDown} className="scrollbar min-h-11 max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-3 text-sm leading-5 outline-none placeholder:text-slate-400 focus:ring-0 dark:bg-transparent" placeholder="Mensagem" aria-label="Mensagem"/>
          <button disabled={sending || !text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar mensagem"><Send size={18}/></button>
        </div><p className="mt-1 hidden text-right text-[10px] text-slate-400 sm:block">Enter envia · Shift + Enter quebra a linha</p>
      </div>
    </form>
  </section>;
}
