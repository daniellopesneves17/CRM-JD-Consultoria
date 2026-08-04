// Ranking mensal dos três maiores resultados com medalhas e mensagem para operação solo.
import { Card } from "@/components/ui/Card";
import { money } from "@/lib/utils";

type Item={id:string;name:string;revenueThisMonth:number;revenueVariation:number};
const medals=["🥇","🥈","🥉"];
export function MedalRanking({items}:{items:Item[]}) {return <div className="grid gap-4 md:grid-cols-3">{items.map((item,index)=><Card key={item.id} className="p-5"><div className="flex items-center gap-3"><span className="text-3xl" aria-label={`${index+1}º lugar`}>{medals[index]}</span><div><strong>{item.name}</strong><p className="text-sm text-slate-500">{money(item.revenueThisMonth)}</p></div></div><p className={`mt-4 text-xs font-semibold ${item.revenueVariation>=0?"text-emerald-600":"text-red-600"}`}>{item.revenueVariation>=0?"+":""}{item.revenueVariation.toFixed(1)}% vs. mês anterior</p>{items.length===1&&<p className="mt-3 text-sm text-brand-700">Continue assim! Você está construindo algo grande.</p>}</Card>)}</div>}
