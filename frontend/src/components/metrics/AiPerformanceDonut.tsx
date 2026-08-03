"use client";
// Donut simples da participação da IA nas conversas.
import { Cell,Pie,PieChart,ResponsiveContainer,Tooltip } from "recharts";
export function AiPerformanceDonut({bot,human}:{bot:number;human:number}){const data=[{name:"IA",value:bot},{name:"Humano",value:human}];return <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84}><Cell fill="#1A3A8F"/><Cell fill="#C8A96E"/></Pie><Tooltip/></PieChart></ResponsiveContainer>}
