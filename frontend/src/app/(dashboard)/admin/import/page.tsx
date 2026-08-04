"use client";
// Página de cadastro em massa para entrada rápida de clientes e leads reais.
import Link from "next/link";
import useSWR from "swr";
import { ArrowRight } from "lucide-react";
import { BulkImportGrid } from "@/components/admin/BulkImportGrid";
import type { Operator } from "@/components/admin/OperatorTable";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
const fetcher=async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error("Falha ao carregar operadoras.");return response.json()};
export default function AdminImportPage(){const{data}=useSWR<{operators:Operator[]}>("/api/admin/operators",fetcher);return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="label">Dados reais</p><h2 className="mt-1 text-3xl font-semibold">Importar clientes e leads</h2><p className="mt-2 text-sm text-slate-500">Cadastre até 50 contatos de uma vez. Preencha como uma planilha.</p></div><Link href="/pipeline" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Ver no Pipeline<ArrowRight size={16}/></Link></div><Card className="mt-7 p-5">{data?<BulkImportGrid operators={data.operators}/>:<Skeleton className="h-[540px]"/>}</Card></>}
