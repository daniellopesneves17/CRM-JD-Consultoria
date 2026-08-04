// Estimativa mensal de custo de IA baseada nos logs efetivamente gravados.
import { Coins } from "lucide-react";
import { Card } from "@/components/ui/Card";
export function CostEstimator({calls,tokens,costUsd}:{calls:number;tokens:number;costUsd:number}){return <Card className="p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Coins size={19}/></span><div><p className="text-xs font-semibold uppercase text-slate-500">Custo estimado de IA no mês</p><p className="text-2xl font-bold">US$ {costUsd.toFixed(4)}</p></div></div><div className="mt-4 flex gap-5 text-xs text-slate-500"><span>{calls} chamadas</span><span>{tokens.toLocaleString("pt-BR")} tokens</span></div></Card>}
