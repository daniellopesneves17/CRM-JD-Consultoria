// Card executivo grande com valor, tendência e ícone contextual.
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function KpiCardLarge({icon:Icon,title,value,variation}:{icon:LucideIcon;title:string;value:string;variation:number}) {
  const positive=variation>0; const neutral=variation===0;
  return <Card className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p><p className="mt-3 text-3xl font-bold tracking-tight">{value}</p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-blue-300"><Icon size={22}/></span></div><p className={`mt-5 flex items-center gap-1 text-sm font-semibold ${neutral?"text-slate-500":positive?"text-emerald-600":"text-red-600"}`}>{neutral?<Minus size={15}/>:positive?<ArrowUpRight size={15}/>:<ArrowDownRight size={15}/>} {Math.abs(variation).toFixed(1)}% <span className="font-normal text-slate-400">vs. mês anterior</span></p></Card>;
}
