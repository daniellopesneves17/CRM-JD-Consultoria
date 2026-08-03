"use client";
// Receita mensal dos últimos 12 meses em gráfico de área.
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function RevenueChart({data=[]}:{data?:Array<{month:string;value:number}>}) {
  return <ResponsiveContainer width="100%" height={280}><AreaChart data={data}><defs><linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={.25}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="month" tick={{fontSize:11,fill:"#64748b"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#64748b"}} axisLine={false} tickLine={false} tickFormatter={(v)=>`${v/1000}k`}/><Tooltip formatter={(value)=>[Number(value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Receita"]}/><Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="url(#revenue)"/></AreaChart></ResponsiveContainer>;
}
