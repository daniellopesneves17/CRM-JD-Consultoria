// Tempo relativo com alerta visual após 24 e 48 horas sem atividade.
import { AlertTriangle } from "lucide-react";
export function RelativeTime({value}:{value?:string|null}){if(!value)return <span>—</span>;const hours=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/3_600_000));const label=hours<1?"há poucos min":hours<24?`há ${hours}h`:`há ${Math.floor(hours/24)} dias`;const color=hours>48?"text-red-600 font-semibold":hours>=24?"text-amber-600":"text-slate-500";return <span className={`inline-flex items-center gap-1 ${color}`}>{hours>48&&<AlertTriangle size={14}/>} {label}</span>}

