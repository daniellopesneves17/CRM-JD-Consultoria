"use client";
// Funil comercial horizontal em Recharts.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function ConversionFunnel({data=[]}:{data?:Array<{name:string;value:number}>}) {
  return <ResponsiveContainer width="100%" height={280}><BarChart data={data} layout="vertical" margin={{left:10,right:20}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={86} tick={{fontSize:12,fill:"#64748b"}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:"#f8fafc"}}/><Bar dataKey="value" fill="#2563eb" radius={[0,6,6,0]} barSize={22}/></BarChart></ResponsiveContainer>;
}
