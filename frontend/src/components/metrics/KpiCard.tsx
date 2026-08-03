// Card de KPI com ícone, tendência e contexto.
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
export function KpiCard({ label, value, change, icon: Icon }: { label:string; value:string; change?:number; icon:LucideIcon }) {
  const positive = (change ?? 0) >= 0;
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={19}/></span></div>{change !== undefined && <p className={`mt-3 flex items-center gap-1 text-xs font-medium ${positive?"text-emerald-600":"text-red-600"}`}>{positive?<TrendingUp size={14}/>:<TrendingDown size={14}/>} {Math.abs(change)}% <span className="font-normal text-slate-400">vs. período anterior</span></p>}</Card>;
}

