// Linha da tabela de pipeline com seleção, alertas de inatividade e ações rápidas.
import { CalendarPlus, Eye, MessageSquare } from "lucide-react";
import { Lead } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { ScoreBadge } from "./ScoreBadge";
import { TemperatureBadge } from "@/components/shared/TemperatureBadge";
import { money } from "@/lib/utils";
const stages={NOVO:["Novo","bg-slate-100 text-slate-700"],QUALIFICADO:["Qualificado","bg-blue-50 text-blue-700"],PROPOSTA_ENVIADA:["Proposta enviada","bg-violet-50 text-violet-700"],EM_ANALISE:["Em análise","bg-cyan-50 text-cyan-700"],NEGOCIACAO:["Negociação","bg-amber-50 text-amber-700"],FECHADO:["Fechado","bg-emerald-50 text-emerald-700"],PERDIDO:["Perdido","bg-red-50 text-red-700"]};
const relative=(date?:string|null)=>{if(!date)return"—";const hours=Math.round((Date.now()-new Date(date).getTime())/36e5);return hours<1?"há poucos min":hours<24?`há ${hours}h`:`há ${Math.floor(hours/24)}d`;};
export function LeadRow({lead,selected,onSelect,onOpen}:{lead:Lead;selected:boolean;onSelect:()=>void;onOpen:()=>void}){
 const inactive=lead.lastActivityAt?Date.now()-new Date(lead.lastActivityAt).getTime()>48*36e5:false;
 return <tr onClick={onOpen} className="cursor-pointer border-t border-slate-100 bg-white text-sm transition hover:bg-slate-50">
 <td className="px-4 py-4" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Selecionar ${lead.name}`}/></td>
 <td className="min-w-52 px-4 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{lead.name.split(" ").map(w=>w[0]).slice(0,2)}</span><div><strong className="block">{lead.name}</strong><span className="text-xs text-slate-500">{lead.phone} • {lead.livesCount} vidas</span></div></div></td>
 <td className="px-4 py-4"><Badge className={stages[lead.stage][1]}>{stages[lead.stage][0]}</Badge></td><td className="px-4 py-4"><ScoreBadge score={lead.score}/></td><td className="px-4 py-4"><TemperatureBadge value={lead.temperature}/></td>
 <td className="whitespace-nowrap px-4 py-4 font-medium">{money(Number(lead.estimatedValue||0))}</td><td className={`whitespace-nowrap px-4 py-4 ${inactive?"font-medium text-red-600":"text-slate-500"}`}>{relative(lead.lastActivityAt)}</td><td className="min-w-40 px-4 py-4 text-slate-600">{lead.tasks?.[0]?.title||"—"}</td>
 <td className="whitespace-nowrap px-4 py-4"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[10px] font-bold">{lead.assignedTo?.name.split(" ").map(w=>w[0]).slice(0,2)}</span>{lead.assignedTo?.name||"—"}</span></td>
 <td className="px-4 py-4"><div className="flex gap-1 text-slate-400"><button aria-label="Ver perfil" className="rounded p-1.5 hover:bg-slate-200 hover:text-brand-600"><Eye size={16}/></button><button aria-label="Enviar mensagem" className="rounded p-1.5 hover:bg-slate-200"><MessageSquare size={16}/></button><button aria-label="Agendar tarefa" className="rounded p-1.5 hover:bg-slate-200"><CalendarPlus size={16}/></button></div></td></tr>;
}

