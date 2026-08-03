"use client";
// Pizza de origem dos leads para análise de aquisição.
import { Cell,Pie,PieChart,ResponsiveContainer,Tooltip } from "recharts";const colors=["#0A1628","#1A3A8F","#C8A96E","#16A34A","#D97706"];
export function LeadSourcePie({data}:{data:Array<{name:string;value:number}>}){return <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>{data.map((item,index)=><Cell key={item.name} fill={colors[index%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>}

