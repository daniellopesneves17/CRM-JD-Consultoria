// Medidor animado de metas com semáforo e projeção comercial.
import { CalendarDays, Gauge, Target } from "lucide-react";
import { money } from "@/lib/utils";
export interface GoalMeterProps { current:number; target:number; workdaysRemaining:number; dailyNeeded:number; projectedEnd:number; color:"red"|"yellow"|"green" }
const colors = { red:["from-red-500 to-rose-600","text-red-600","bg-red-50"], yellow:["from-amber-400 to-orange-500","text-amber-600","bg-amber-50"], green:["from-emerald-400 to-green-600","text-emerald-600","bg-emerald-50"] };
export function GoalMeter({current,target,workdaysRemaining,dailyNeeded,projectedEnd,color}:GoalMeterProps) {
  const percentage=Math.min(100,(current/target)*100); const palette=colors[color];
  const message=color==="red"?`Você precisa de ${money(dailyNeeded)} por dia nos próximos ${workdaysRemaining} dias úteis para bater a meta`:color==="yellow"?"No ritmo certo! Mantenha o foco":`Excelente! Você está acima do ritmo necessário`;
  return <div><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-slate-500">Valor realizado</p><p className="mt-1 text-3xl font-semibold">{money(current)} <span className="text-lg font-medium text-slate-400">/ {money(target)}</span></p></div><strong className={`text-3xl ${palette[1]}`}>{percentage.toFixed(0)}%</strong></div>
    <div className="mt-6 h-5 overflow-hidden rounded-full bg-slate-100 p-1"><div className={`goal-meter-fill h-full rounded-full bg-gradient-to-r ${palette[0]}`} style={{"--meter-width":`${percentage}%`} as React.CSSProperties}/></div>
    <p className={`mt-4 rounded-lg p-3 text-sm font-medium ${palette[1]} ${palette[2]}`}>{message}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Mini icon={CalendarDays} label="Dias úteis restantes" value={String(workdaysRemaining)}/><Mini icon={Target} label="Necessário por dia" value={money(dailyNeeded)}/><Mini icon={Gauge} label="Projeção no mês" value={money(projectedEnd)}/></div>
  </div>;
}
function Mini({icon:Icon,label,value}:{icon:typeof Target;label:string;value:string}) { return <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><Icon className="text-brand-600" size={18}/><div><p className="text-[11px] text-slate-500">{label}</p><p className="text-sm font-semibold">{value}</p></div></div>; }

