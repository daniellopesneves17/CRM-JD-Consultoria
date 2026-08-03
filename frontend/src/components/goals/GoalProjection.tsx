"use client";
// Histórico comparativo entre meta e realizado.
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function GoalProjection({data=[]}:{data?:Array<{m:string;meta:number;real:number}>}){return <ResponsiveContainer width="100%" height={260}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="m" axisLine={false} tickLine={false}/><YAxis tickFormatter={(v)=>`${v/1000}k`} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Bar name="Meta" dataKey="meta" fill="#cbd5e1" radius={[5,5,0,0]}/><Bar name="Realizado" dataKey="real" fill="#2563eb" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>}
