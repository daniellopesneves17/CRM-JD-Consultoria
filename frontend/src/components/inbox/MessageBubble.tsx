"use client";

// Bolha inspirada no WhatsApp, com mídia fluida, prévia nativa e status de leitura.
import { useEffect, useState } from "react";
import { Bot, Check, CheckCheck, Download, FileText, ImageIcon, Maximize2, Mic, Video, X } from "lucide-react";
import { Message } from "@/types";
import { cn } from "@/lib/utils";
import { WhatsAppText } from "./WhatsAppText";

function StatusIcon({ message }: { message: Message }) {
  if (message.sender === "LEAD") return null;
  if (message.readAt) return <CheckCheck size={14} className="text-sky-300" aria-label="Lida"/>;
  if (message.deliveredAt) return <CheckCheck size={14} aria-label="Entregue"/>;
  return <Check size={14} aria-label="Enviada"/>;
}

export function MessageBubble({ message }: { message: Message }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const incoming = message.sender === "LEAD";
  const label = message.content.replace(/^\[(imagem|vídeo|arquivo|áudio)\]$/i, "");
  useEffect(() => {
    if (!previewOpen) return;
    function close(event: KeyboardEvent) { if (event.key === "Escape") setPreviewOpen(false); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [previewOpen]);
  useEffect(() => setMediaFailed(false), [message.mediaUrl]);
  return <>
  <div className={cn("flex", incoming ? "justify-start" : "justify-end")}>
    <article className={cn(
      "relative max-w-[86%] overflow-hidden rounded-2xl shadow-sm sm:max-w-[76%]",
      incoming
        ? "rounded-bl-md border border-slate-200/80 bg-white text-slate-800 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100"
        : message.sender === "BOT"
          ? "rounded-br-md border border-indigo-300/30 bg-indigo-100 text-slate-900 dark:bg-indigo-950/70 dark:text-slate-100"
          : "rounded-br-md bg-brand-700 text-white"
    )}>
      {message.sender === "BOT" && <div className="flex items-center gap-1.5 border-b border-current/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider opacity-70"><Bot size={13}/>Resposta inicial da IA</div>}
      {message.type === "IMAGE" && <div className="bg-slate-950/5 p-1 dark:bg-black/15">
        {message.mediaUrl && !mediaFailed ? <button type="button" onClick={() => setPreviewOpen(true)} className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl" title="Ampliar imagem"><img src={message.mediaUrl} alt="Imagem da conversa" className="max-h-[min(48vh,420px)] w-full object-contain transition duration-200 group-hover:scale-[1.01]" loading="lazy" decoding="async" onError={() => setMediaFailed(true)}/><span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/65 text-white opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100"><Maximize2 size={15}/></span></button> : <div className="flex min-h-32 items-center justify-center gap-2 px-4 text-center text-sm opacity-70"><ImageIcon size={18}/>Imagem indisponível ou expirada. Sincronize novamente.</div>}
      </div>}
      {message.type === "VIDEO" && <div className="bg-black">
        {message.mediaUrl ? <video controls playsInline preload="metadata" src={message.mediaUrl} className="max-h-[min(48vh,420px)] w-full object-contain">Seu navegador não reproduz este vídeo.</video> : <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-white/70"><Video size={18}/>Vídeo indisponível</div>}
      </div>}
      <div className="px-3.5 py-2.5">
        {message.type === "AUDIO" && <div className="mb-2 min-w-[220px]"><div className="mb-2 flex items-center gap-2 text-xs font-semibold opacity-75"><Mic size={15}/>Mensagem de áudio</div>{message.mediaUrl ? <audio controls preload="metadata" src={message.mediaUrl} className="h-10 w-full max-w-[330px]"/> : <p className="text-xs opacity-70">Áudio indisponível</p>}</div>}
        {message.type === "DOCUMENT" && <div className="mb-2">
          {message.mediaUrl ? <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="flex min-w-[220px] items-center gap-3 rounded-xl bg-black/10 p-3 transition hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15"><span className="grid h-10 w-10 place-items-center rounded-lg bg-white/80 text-brand-700 dark:bg-slate-900 dark:text-brand-300"><FileText size={20}/></span><span className="min-w-0 flex-1"><strong className="block text-sm">Arquivo do WhatsApp</strong><span className="block text-[11px] opacity-65">Toque para visualizar</span></span><Download size={17}/></a> : <div className="flex items-center gap-2 text-sm opacity-70"><FileText size={17}/>Arquivo indisponível</div>}
        </div>}
        {label && <WhatsAppText>{label}</WhatsAppText>}
        {message.transcription && <details className="mt-2 border-t border-current/10 pt-2"><summary className="cursor-pointer text-xs font-semibold">Ver transcrição</summary><div className="mt-1 text-xs opacity-80"><WhatsAppText>{message.transcription}</WhatsAppText></div></details>}
        <footer className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", incoming ? "text-slate-400" : "text-current/65")}><time>{new Date(message.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><StatusIcon message={message}/></footer>
      </div>
    </article>
  </div>
  {previewOpen && message.mediaUrl && <div role="dialog" aria-modal="true" aria-label="Visualização da imagem" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
    <div className="absolute inset-x-0 top-0 flex h-16 items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 text-white sm:px-7"><span className="text-sm font-semibold">Imagem da conversa</span><button type="button" onClick={() => setPreviewOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Fechar visualização"><X size={22}/></button></div>
    <img src={message.mediaUrl} alt="Imagem ampliada da conversa" className="max-h-[calc(100dvh-5rem)] max-w-full select-none object-contain" decoding="async"/>
  </div>}
  </>;
}
