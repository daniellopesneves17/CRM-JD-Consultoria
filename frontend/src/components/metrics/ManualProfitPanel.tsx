"use client";

import { FormEvent, useState } from "react";
import { CircleDollarSign, ExternalLink, Paperclip, Plus, RotateCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import useSWR, { mutate as mutateCache } from "swr";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { money } from "@/lib/utils";
import { uploadProfitProofDirect, validateProfitProofFile } from "@/lib/direct-profit-proof-upload";

type Category = "COMMISSION" | "BONUS" | "ADJUSTMENT" | "OTHER";
type Entry = {
  id: string;
  amount: number | string;
  description: string;
  category: Category;
  occurredAt: string;
  user: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  proofName?: string | null;
};
type Data = { entries: Entry[]; users: Array<{ id: string; name: string }>; total: number };

const categories: Array<[Category, string]> = [
  ["COMMISSION", "Comissão"],
  ["BONUS", "Bônus"],
  ["ADJUSTMENT", "Ajuste"],
  ["OTHER", "Outro"],
];

const categoryLabel = Object.fromEntries(categories) as Record<Category, string>;
const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Falha ao carregar os lançamentos.");
  return body as Data;
};

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return Number(normalized);
}

export function ManualProfitPanel() {
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<Data>("/api/manual-profits", fetcher);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("COMMISSION");
  const [occurredOn, setOccurredOn] = useState(today);
  const [userId, setUserId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofInputKey, setProofInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const isAdmin = session?.user.role === "ADMIN";
  const total = Number(data?.total ?? 0);

  async function refreshFinancialData() {
    await Promise.all([
      mutate(),
      mutateCache((key) => typeof key === "string" && (key.startsWith("/api/metrics/") || key === "/api/admin/overview" || key === "/api/admin/team" || key === "/api/admin/accounts")),
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const numericAmount = parseAmount(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Informe um valor maior que zero.");
      if (!isAdmin && !proofFile) throw new Error("Anexe um comprovante para registrar seu lucro.");
      const proof = proofFile ? await uploadProfitProofDirect(proofFile, (percentage) => {
        setUploadProgress(percentage);
        setNotice(`Enviando comprovante... ${percentage}%`);
      }) : null;
      setNotice("Registrando lucro...");
      const response = await fetch("/api/manual-profits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          description,
          category,
          occurredAt: new Date(`${occurredOn}T12:00:00-03:00`).toISOString(),
          userId: isAdmin ? (userId || null) : undefined,
          proofPath: proof?.path,
          proofName: proof?.name,
          proofType: proof?.type,
          proofSize: proof?.size,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Não foi possível registrar o lucro.");
      setAmount("");
      setDescription("");
      setCategory("COMMISSION");
      setOccurredOn(today());
      setProofFile(null);
      setProofInputKey((value) => value + 1);
      setUploadProgress(0);
      setNotice("Lucro registrado e incluído nas métricas.");
      await refreshFinancialData();
    } catch (submitError) {
      setNotice(submitError instanceof Error ? submitError.message : "Não foi possível registrar o lucro.");
    } finally {
      setSaving(false);
    }
  }

  async function voidEntry(entry: Entry) {
    if (!window.confirm(`Estornar o lançamento de ${money(Number(entry.amount))}?`)) return;
    setNotice("");
    const response = await fetch(`/api/manual-profits/${entry.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setNotice(body?.error ?? "Não foi possível estornar o lançamento.");
      return;
    }
    setNotice("Lançamento estornado e removido das métricas.");
    await refreshFinancialData();
  }

  return <Card className="mt-6 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 md:p-6 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><CircleDollarSign size={22}/></span>
        <div><h2 className="text-lg font-semibold">Lucros manuais</h2><p className="text-sm text-slate-500">Registre comissões, bônus e ajustes que não vieram de uma proposta.</p></div>
      </div>
      <div className="text-right"><p className="label">Total lançado</p><strong className="text-xl text-emerald-600 dark:text-emerald-400">{money(total)}</strong></div>
    </div>

    <form onSubmit={submit} className="grid gap-4 border-b bg-slate-50/60 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-950/20">
      <label className="text-sm font-medium">Valor
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="R$ 0,00" required className="input mt-2"/>
      </label>
      <label className="text-sm font-medium xl:col-span-2">Descrição
        <input value={description} onChange={(event) => setDescription(event.target.value)} minLength={2} maxLength={160} placeholder="Ex.: comissão recebida" required className="input mt-2"/>
      </label>
      <label className="text-sm font-medium">Categoria
        <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="input mt-2">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
      <label className="text-sm font-medium">Data
        <input type="date" value={occurredOn} max={today()} onChange={(event) => setOccurredOn(event.target.value)} required className="input mt-2"/>
      </label>
      {isAdmin && <label className="text-sm font-medium">Atribuição
        <select value={userId} onChange={(event) => setUserId(event.target.value)} className="input mt-2"><option value="">Geral da empresa</option>{data?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
      </label>}
      <label className="text-sm font-medium md:col-span-2 xl:col-span-5">Comprovante {!isAdmin && <span className="text-red-500">*</span>}
        <span className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-sm text-slate-600 transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Paperclip size={17}/><span className="min-w-0 flex-1 truncate">{proofFile?.name ?? (isAdmin ? "Anexar comprovante (opcional)" : "Anexar comprovante obrigatório")}</span>
          <span className="text-xs text-slate-400">PNG, JPG, WebP ou PDF · 20 MB</span>
          <input key={proofInputKey} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required={!isAdmin} className="hidden" onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            try { if (file) validateProfitProofFile(file); setProofFile(file); setNotice(""); } catch (fileError) { setProofFile(null); setNotice(fileError instanceof Error ? fileError.message : "Comprovante inválido."); event.target.value = ""; }
          }}/>
        </span>
        {!isAdmin && <small className="mt-1 block text-slate-500">O lançamento só será contabilizado após o envio da prova.</small>}
      </label>
      <div className="flex items-end"><Button disabled={saving} className="w-full whitespace-nowrap"><Plus size={16}/>{saving ? (uploadProgress ? `${uploadProgress}%` : "Salvando...") : "Adicionar lucro"}</Button></div>
    </form>

    {notice && <div className="border-b px-5 py-3 text-sm text-brand-700 dark:border-slate-800 dark:text-brand-300">{notice}</div>}
    {error && <div className="p-6 text-sm text-red-600">{error.message}</div>}
    {isLoading && <div className="p-6 text-sm text-slate-500">Carregando lançamentos...</div>}
    {!isLoading && !error && (data?.entries.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="px-5 py-3">Data</th><th>Descrição</th><th>Categoria</th><th>Atribuição</th><th>Comprovante</th><th>Valor</th><th className="pr-5 text-right">Ação</th></tr></thead>
      <tbody className="divide-y dark:divide-slate-800">{data.entries.map((entry) => <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
        <td className="whitespace-nowrap px-5 py-4">{new Date(entry.occurredAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
        <td><strong className="block max-w-sm truncate">{entry.description}</strong><small className="text-slate-500">Lançado por {entry.createdBy.name}</small></td>
        <td>{categoryLabel[entry.category]}</td>
        <td>{entry.user?.name ?? "Geral da empresa"}</td>
        <td>{entry.proofName ? <a href={`/api/manual-profits/${entry.id}/proof`} target="_blank" rel="noreferrer" className="inline-flex max-w-44 items-center gap-1 truncate font-semibold text-brand-600 hover:underline"><ExternalLink size={14}/>{entry.proofName}</a> : <span className="text-slate-400">Sem anexo</span>}</td>
        <td className="font-semibold text-emerald-600 dark:text-emerald-400">{money(Number(entry.amount))}</td>
        <td className="pr-5 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => void voidEntry(entry)}><RotateCcw size={14}/>Estornar</Button></td>
      </tr>)}</tbody>
    </table></div> : <div className="p-8 text-center text-sm text-slate-500">Nenhum lucro manual registrado.</div>)}
  </Card>;
}
