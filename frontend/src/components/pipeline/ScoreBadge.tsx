// Score comercial com barra proporcional e faixas de prioridade.
import { cn } from "@/lib/utils";
export function ScoreBadge({score}:{score:number}){const color=score>=70?"bg-emerald-500":score>=40?"bg-amber-500":"bg-red-500";return <div className="flex min-w-24 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full",color)} style={{width:`${score}%`}}/></div><strong className="w-7 text-right text-xs">{score}</strong></div>}
