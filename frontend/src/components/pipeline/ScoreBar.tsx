// Barra compacta do score de IA, de 0 a 100.
export function ScoreBar({score}:{score:number}){const safe=Math.max(0,Math.min(100,score));const color=safe>=70?"bg-emerald-500":safe>=40?"bg-amber-500":"bg-red-500";return <div className="min-w-24"><div className="flex items-center justify-between text-xs"><span className="font-semibold">{safe}</span><span className="text-slate-400">/100</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{width:`${safe}%`}}/></div></div>}

