"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ExternalLink, History, LoaderCircle, Menu, MessageSquarePlus, Newspaper, Send, Sparkles, Trash2, X } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { JdAiSource } from "@/lib/jd-ai";

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Array<{ content: string }>;
  _count: { messages: number };
};
type BriefingSummary = { researchDate: string; title: string; createdAt: string } | null;
type Message = { id: string; role: "USER" | "ASSISTANT"; content: string; sources: unknown; createdAt: string };
type Conversation = { id: string; title: string; messages: Message[] };

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar a JD AI.");
  return response.json();
};

const suggestions = [
  "Quais mudanças recentes da ANS merecem atenção?",
  "Explique portabilidade de carências de forma simples.",
  "Quais assuntos estão em alta no mercado de planos de saúde?",
  "Crie um resumo do cenário atual para minha reunião comercial.",
];

function parseSources(value: unknown): JdAiSource[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JdAiSource => Boolean(item && typeof item === "object" && "url" in item && "title" in item && typeof item.url === "string" && typeof item.title === "string"));
}

function MessageText({ content }: { content: string }) {
  return <div className="space-y-3 whitespace-pre-wrap leading-7">{content.split(/\n{2,}/).map((block, index) => <p key={`${index}-${block.slice(0, 12)}`}>{block}</p>)}</div>;
}

function resizeMessageInput(textarea: HTMLTextAreaElement) {
  textarea.style.height = "44px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
}

export default function JdAiPage() {
  const { data, mutate: mutateList, isLoading: loadingList } = useSWR<{ items: ConversationSummary[]; briefing: BriefingSummary }>("/api/jd-ai/conversations", fetchJson);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeId || !data?.items[0]) return;
    setActiveId(data.items[0].id);
  }, [activeId, data?.items]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let current = true;
    setLoadingConversation(true);
    fetchJson<Conversation>(`/api/jd-ai/conversations/${activeId}`)
      .then((conversation) => { if (current) setMessages(conversation.messages); })
      .catch(() => { if (current) setError("Não foi possível abrir esta conversa."); })
      .finally(() => { if (current) setLoadingConversation(false); });
    return () => { current = false; };
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    resizeMessageInput(textarea);
  }, [input]);

  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError("");
    setHistoryOpen(false);
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    setError("");
    setHistoryOpen(false);
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm("Excluir esta conversa da JD AI?")) return;
    const response = await fetch(`/api/jd-ai/conversations/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Não foi possível excluir a conversa.");
      return;
    }
    if (activeId === id) startNew();
    await mutateList();
  };

  const sendMessage = async (event?: FormEvent, suggestedMessage?: string) => {
    event?.preventDefault();
    const message = (suggestedMessage ?? input).trim();
    if (message.length < 2 || sending) return;
    setError("");
    setInput("");
    const temporary: Message = { id: `temp-${Date.now()}`, role: "USER", content: message, sources: null, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, temporary]);
    setSending(true);
    try {
      const response = await fetch("/api/jd-ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(activeId ? { conversationId: activeId } : {}), message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "A JD AI não conseguiu responder.");
      setMessages((current) => [...current.filter((item) => item.id !== temporary.id), result.userMessage, result.assistantMessage]);
      if (!activeId) setActiveId(result.conversation.id);
      await mutateList();
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== temporary.id));
      setInput(message);
      setError(caught instanceof Error ? caught.message : "A JD AI não conseguiu responder agora.");
    } finally {
      setSending(false);
    }
  };

  const activeTitle = data?.items.find((item) => item.id === activeId)?.title ?? "Nova conversa";

  return <div className="-m-5 overflow-hidden md:-m-8 lg:-m-10">
    <div className="relative flex h-[calc(100dvh-5rem)] min-h-0 overflow-hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {historyOpen && <button className="absolute inset-0 z-20 bg-slate-950/55 backdrop-blur-sm xl:hidden" onClick={() => setHistoryOpen(false)} aria-label="Fechar painel de histórico"/>}
      <aside className={cn("absolute inset-y-0 left-0 z-30 flex min-h-0 w-[min(19rem,88vw)] flex-col border-r border-slate-200 bg-slate-50 shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 xl:static xl:w-72 xl:translate-x-0 xl:shadow-none", historyOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <Button onClick={startNew} className="flex-1"><MessageSquarePlus size={17}/> Nova conversa</Button>
          <button onClick={() => setHistoryOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 xl:hidden" aria-label="Fechar histórico"><X size={19}/></button>
        </div>
        <div className="scrollbar flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[.12em] text-slate-500"><History size={14}/> Conversas</div>
          {loadingList ? <div className="grid place-items-center py-10 text-slate-400"><LoaderCircle className="animate-spin"/></div> : data?.items.length ? <div className="space-y-1">{data.items.map((conversation) => <div key={conversation.id} className={cn("group flex items-center rounded-xl", activeId === conversation.id ? "bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" : "hover:bg-white/80 dark:hover:bg-slate-900/70")}>
            <button onClick={() => selectConversation(conversation.id)} className="min-w-0 flex-1 px-3 py-3 text-left">
              <strong className="block truncate text-sm text-slate-800 dark:text-slate-100">{conversation.title}</strong>
              <span className="mt-1 block truncate text-xs text-slate-500">{conversation.messages[0]?.content || "Conversa vazia"}</span>
            </button>
            <button onClick={() => deleteConversation(conversation.id)} className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-red-950/30" aria-label={`Excluir ${conversation.title}`}><Trash2 size={15}/></button>
          </div>)}</div> : <p className="px-2 py-8 text-center text-sm text-slate-500">Suas conversas aparecerão aqui.</p>}
        </div>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><Newspaper className="mt-0.5 shrink-0" size={17}/><div><strong className="block text-xs">Radar diário</strong><span className="mt-1 block text-[11px] leading-4">{data?.briefing ? `Atualizado em ${data.briefing.researchDate.split("-").reverse().join("/")}` : "Aguardando a primeira atualização"}</span></div></div>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(37,99,235,.07),transparent_34%)] dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,.12),transparent_34%)]">
        <header className="z-10 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:px-6">
          <button onClick={() => setHistoryOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 xl:hidden" aria-label="Abrir histórico"><Menu size={19}/></button>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-md shadow-blue-900/20"><Sparkles size={18}/></div>
          <div className="min-w-0"><h1 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{activeTitle}</h1><p className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> JD AI · pesquisa com fontes</p></div>
        </header>

        <div className="scrollbar min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col">
            {loadingConversation ? <div className="grid flex-1 place-items-center text-slate-400"><LoaderCircle className="animate-spin" size={28}/></div> : messages.length === 0 ? <div className="jd-ai-welcome flex flex-1 flex-col items-center justify-center py-5 text-center sm:py-8">
              <div className="relative"><div className="absolute inset-0 rounded-3xl bg-brand-500/25 blur-2xl"/><div className="jd-ai-orb relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-blue-600 to-violet-600 text-white shadow-xl shadow-blue-950/20 sm:h-20 sm:w-20 sm:rounded-3xl"><Bot className="h-7 w-7 sm:h-9 sm:w-9"/></div></div>
              <p className="label mt-5 sm:mt-7">Inteligência para corretagem</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Como a JD AI pode ajudar?</h2><p className="jd-ai-description mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:mt-3">Pesquise normas, tendências e notícias do mercado de planos de saúde. As respostas atuais mostram as fontes consultadas.</p>
              <div className="jd-ai-suggestions mt-5 grid w-full gap-2.5 sm:mt-7 sm:grid-cols-2 sm:gap-3">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(undefined, suggestion)} className="jd-ai-suggestion rounded-2xl border border-slate-200 bg-white/80 p-3.5 text-left text-sm font-medium leading-5 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-brand-700 sm:p-4"><Sparkles className="mb-2 text-brand-500 sm:mb-3" size={17}/>{suggestion}</button>)}</div>
            </div> : <div className="space-y-7">{messages.map((message) => {
              const sources = parseSources(message.sources);
              return <article key={message.id} className={cn("flex gap-3 sm:gap-4", message.role === "USER" && "justify-end")}>
                {message.role === "ASSISTANT" && <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Sparkles size={17}/></span>}
                <div className={cn("max-w-[88%] text-sm", message.role === "USER" ? "rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-white shadow-md shadow-blue-950/10" : "min-w-0 flex-1 text-slate-700 dark:text-slate-200")}>
                  <MessageText content={message.content}/>
                  {sources.length > 0 && <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">Fontes consultadas</p><div className="flex flex-wrap gap-2">{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><span className="truncate">{source.title}</span><ExternalLink className="shrink-0" size={12}/></a>)}</div></div>}
                </div>
              </article>;
            })}{sending && <div className="flex gap-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Sparkles size={17}/></span><div className="flex items-center gap-2 py-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17}/> Pesquisando fontes e preparando a resposta...</div></div>}</div>}
            <div ref={bottomRef}/>
          </div>
        </div>

        <div className="z-10 shrink-0 border-t border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-7 sm:py-4">
          <div className="mx-auto max-w-3xl">
            {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
            <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900">
              <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onInput={(event) => resizeMessageInput(event.currentTarget)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} maxLength={4000} placeholder="Pergunte à JD AI..." className="scrollbar max-h-36 min-h-11 flex-1 resize-none overflow-y-auto border-0 !bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100" aria-label="Mensagem para a JD AI"/>
              <button type="submit" disabled={sending || input.trim().length < 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800" aria-label="Enviar mensagem">{sending ? <LoaderCircle className="animate-spin" size={18}/> : <Send size={18}/>}</button>
            </form>
            <p className="jd-ai-disclaimer mt-2 hidden text-center text-[11px] text-slate-400 sm:block">A JD AI pode cometer erros. Confirme decisões médicas, jurídicas e regulatórias nas fontes oficiais.</p>
          </div>
        </div>
      </section>
    </div>
  </div>;
}
