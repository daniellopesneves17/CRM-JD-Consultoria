// Bolha de mensagem com variações para lead, bot e corretor, incluindo áudio.
import { FileText, Mic } from "lucide-react";
import { Message } from "@/types";
import { cn } from "@/lib/utils";
export function MessageBubble({message}:{message:Message}){const incoming=message.sender==="LEAD";return <div className={cn("flex",incoming?"justify-start":"justify-end")}><div className={cn("max-w-[76%] rounded-2xl px-4 py-3 text-sm leading-6",incoming?"rounded-bl-md bg-slate-100 text-slate-800":message.sender==="BOT"?"rounded-br-md border border-blue-100 bg-brand-50 text-slate-800":"rounded-br-md bg-brand-600 text-white")}>
{message.type==="AUDIO"&&<div className="mb-2 flex items-center gap-2 font-semibold"><Mic size={16}/>Mensagem de áudio</div>}{message.type==="DOCUMENT"&&<div className="mb-2 flex items-center gap-2 font-semibold"><FileText size={16}/>Documento</div>}<p>{message.content}</p>{message.transcription&&<details className="mt-2 border-t border-current/10 pt-2"><summary className="cursor-pointer text-xs font-semibold">Ver transcrição</summary><p className="mt-1 text-xs">{message.transcription}</p></details>}<p className={cn("mt-1 text-right text-[10px]",incoming?"text-slate-400":"text-current/60")}>{new Date(message.sentAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p></div></div>}

