// Resumo visual dos alertas de vencimento, churn e aniversários.
import { AlertTriangle, Cake, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
const items=[{key:"expiring",label:"Vencimentos",icon:CalendarClock,color:"text-red-600 bg-red-50"},{key:"churn",label:"Risco de churn",icon:AlertTriangle,color:"text-amber-600 bg-amber-50"},{key:"birthdays",label:"Aniversariantes",icon:Cake,color:"text-blue-600 bg-blue-50"}] as const;
export function CarteiraAlerts({counts}:{counts:{expiring:number;churn:number;birthdays:number}}){return <div className="grid gap-4 sm:grid-cols-3">{items.map(item=><Card key={item.key} className="flex items-center gap-4 p-5"><span className={`grid h-11 w-11 place-items-center rounded-xl ${item.color}`}><item.icon size={20}/></span><div><p className="text-2xl font-bold">{counts[item.key]}</p><p className="text-sm text-slate-500">{item.label}</p></div></Card>)}</div>}
