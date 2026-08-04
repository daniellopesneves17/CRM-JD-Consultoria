"use client";
// Card editável de automação com estado, configuração e métricas reais.
import { useState } from "react";
import { Clock3, LoaderCircle, Power, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type AutomationItem={id:string;name:string;description:string;model:string;active:boolean;delayHours:number;config:Record<string,unknown>|null;sentCount:number;convertedCount:number;conversionRate:number;lastRunAt:string|null};

export function AutomationToggle({item,onSave}:{item:AutomationItem;onSave:(id:string,changes:{active?:boolean;delayHours?:number;config?:Record<string,unknown>})=>Promise<void>}) {
  const [config,setConfig]=useState<Record<string,unknown>>(item.config??{}); const[saving,setSaving]=useState(false);
  async function save(changes:{active?:boolean;delayHours?:number;config?:Record<string,unknown>}){setSaving(true);try{await onSave(item.id,changes)}finally{setSaving(false)}}
  function field(key:string,value:unknown){setConfig(current=>({...current,[key]:value}))}
  return <Card className="p-6"><div className="flex items-start gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${item.active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}><Sparkles size={19}/></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.description}</p><span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.model}</span></div><button role="switch" aria-checked={item.active} disabled={saving} onClick={()=>save({active:!item.active})} className={`relative h-7 w-12 rounded-full transition ${item.active?"bg-emerald-500":"bg-slate-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${item.active?"left-6":"left-1"}`}/></button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {item.id==="pre-attendance"&&<><Field label="Início"><input type="time" value={String(config.startHour??"08:00")} onChange={event=>field("startHour",event.target.value)} className="input"/></Field><Field label="Fim"><input type="time" value={String(config.endHour??"20:00")} onChange={event=>field("endHour",event.target.value)} className="input"/></Field></>}
      {item.id==="proposal-follow-up"&&<div className="sm:col-span-2"><p className="text-xs font-semibold text-slate-500">Disparos</p><div className="mt-2 flex gap-4">{[1,3,7].map(day=>{const days=Array.isArray(config.days)?config.days.map(Number):[];return <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={days.includes(day)} onChange={event=>field("days",event.target.checked?[...days,day]:days.filter(value=>value!==day))}/>D+{day}</label>})}</div></div>}
      {item.id==="base-reactivation"&&<><Field label="Dias de inatividade"><input type="number" min={1} value={Number(config.inactiveDays??30)} onChange={event=>field("inactiveDays",Number(event.target.value))} className="input"/></Field><Field label="Máximo por dia"><input type="number" min={1} max={50} value={Number(config.dailyLimit??15)} onChange={event=>field("dailyLimit",Number(event.target.value))} className="input"/></Field></>}
      {!["pre-attendance","proposal-follow-up","base-reactivation"].includes(item.id)&&<p className="sm:col-span-2 text-xs text-slate-500">{item.id==="sentiment-analysis"?"Desativar reduz o custo de tokens, mas remove os indicadores de humor.":"Esta automação usa a configuração operacional recomendada."}</p>}
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-4 border-t pt-4 text-xs text-slate-500"><span className="flex items-center gap-1"><Send size={14}/>Enviadas: {item.sentCount}</span><span>Convertidas: {item.convertedCount}</span><span>Taxa: {item.conversionRate.toFixed(1)}%</span><span className="flex items-center gap-1"><Clock3 size={14}/>{item.lastRunAt?new Date(item.lastRunAt).toLocaleString("pt-BR"):"Nunca executada"}</span><Button size="sm" variant="secondary" className="ml-auto" disabled={saving} onClick={()=>save({config})}>{saving?<LoaderCircle className="animate-spin" size={14}/>:<Power size={14}/>}Salvar</Button></div>
  </Card>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-500">{label}{children}</label>}
