// Badge quadrado por etapa do funil.
import { Badge } from "@/components/ui/Badge";import type { Stage } from "@/types";
const stages:Record<Stage,[string,string]>={NOVO:["Novo","bg-slate-100 text-slate-700"],QUALIFICADO:["Qualificado","bg-blue-50 text-blue-700"],PROPOSTA_ENVIADA:["Proposta enviada","bg-violet-50 text-violet-700"],EM_ANALISE:["Em análise","bg-yellow-50 text-yellow-700"],NEGOCIACAO:["Negociação","bg-orange-50 text-orange-700"],FECHADO:["Fechado","bg-emerald-50 text-emerald-700"],PERDIDO:["Perdido","bg-red-50 text-red-700"]};
export function StageBadge({value}:{value:Stage}){const item=stages[value];return <Badge className={`${item[1]} rounded-none`}>{item[0]}</Badge>}

