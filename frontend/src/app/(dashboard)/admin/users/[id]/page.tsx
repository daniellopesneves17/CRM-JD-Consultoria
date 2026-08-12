"use client";
// Perfil completo do corretor com carteira, gráfico, auditoria e ações administrativas.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Camera, KeyRound, Pencil, Repeat2, Trash2, UserRound } from "lucide-react";
import { Toaster, toast } from "sonner";
import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { ResetPasswordModal } from "@/components/admin/users/ResetPasswordModal";
import { TransferLeadsModal } from "@/components/admin/users/TransferLeadsModal";
import { UserActivityLog } from "@/components/admin/users/UserActivityLog";
import type { ManagedUser, UserProfileResponse } from "@/components/admin/users/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/utils";

const fetcher = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Falha ao carregar perfil."); return response.json(); };
type UsersResponse = { users: ManagedUser[]; total: number };
const stageLabels: Record<string, string> = { NOVO: "Novo", QUALIFICADO: "Qualificado", PROPOSTA_ENVIADA: "Proposta", EM_ANALISE: "Em análise", NEGOCIACAO: "Negociação", FECHADO: "Fechado", PERDIDO: "Perdido" };

function initials(name: string) { return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function date(value: string | null) { return value ? new Date(value).toLocaleString("pt-BR") : "Nunca acessou"; }
function Metric({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { data, error, mutate } = useSWR<UserProfileResponse>(`/api/admin/users/${params.id}`, fetcher);
  const { data: list, mutate: mutateList } = useSWR<UsersResponse>("/api/admin/users", fetcher);
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const activeAdminCount = list?.users.filter((user) => user.role === "ADMIN" && user.active).length || 0;
  const destinations = list?.users.filter((user) => user.role === "CORRETOR" && user.active && user.crmEnabled !== false) || [];
  const managedUser = useMemo<ManagedUser | undefined>(() => data ? { ...data.user, activeLeads: data.stats.activeLeads, closedLeads: data.stats.closedLeads } : undefined, [data]);
  const ownAccount = session?.user.id === params.id;

  async function refresh() { await Promise.all([mutate(), mutateList()]); }
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.set("file", file);
    const response = await fetch(`/api/admin/users/${params.id}/avatar`, { method: "POST", body: form });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { toast.error(result.error || "Não foi possível atualizar a foto."); return; }
    toast.success("Foto atualizada."); await refresh();
  }
  async function remove() {
    const response = await fetch(`/api/admin/users/${params.id}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; toast.error(result.error || "Não foi possível remover a conta."); return; }
    toast.success("Conta removida."); router.push("/admin/users");
  }

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">Não foi possível carregar este usuário. <Link href="/admin/users" className="font-semibold underline">Voltar</Link></div>;
  if (!data || !managedUser) return <div className="space-y-5"><Skeleton className="h-10 w-72"/><Skeleton className="h-64"/><div className="grid gap-4 md:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-28"/>)}</div></div>;
  return <>
    <Toaster richColors position="top-right"/>
    <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={16}/>Voltar para corretores</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="label">Perfil do corretor</p><h2 className="mt-1 text-3xl font-semibold">{data.user.name}</h2><p className="mt-2 text-sm text-slate-500">Acesso, carteira e histórico completo.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={ownAccount} onClick={() => setEditing(true)}><Pencil size={16}/>Editar</Button><Button variant="secondary" disabled={ownAccount} onClick={() => setResetting(true)}><KeyRound size={16}/>Senha</Button><Button onClick={() => setTransferring(true)}><Repeat2 size={16}/>Transferir carteira</Button></div></div>
    <Card className="mt-7 p-6"><div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative h-20 w-20 shrink-0">{data.user.avatarUrl ? <img src={data.user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover"/> : <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">{initials(data.user.name)}</span>}{!ownAccount && <label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-brand-600 text-white shadow" title="Enviar foto"><Camera size={15}/><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadAvatar(event)} className="sr-only"/></label>}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-semibold">{data.user.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.user.role === "ADMIN" ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{data.user.role === "ADMIN" ? "Admin" : "Corretor"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.user.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{data.user.active ? "Ativo" : "Inativo"}</span></div><p className="mt-1 text-sm text-slate-500">{data.user.email}{data.user.phone ? ` • ${data.user.phone}` : ""}</p><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500"><span>Cadastrado em <strong className="text-slate-700 dark:text-slate-300">{new Date(data.user.createdAt).toLocaleDateString("pt-BR")}</strong></span><span>Último acesso <strong className="text-slate-700 dark:text-slate-300">{date(data.user.lastLoginAt)}</strong></span><span>Total de logins <strong className="text-slate-700 dark:text-slate-300">{data.user.loginCount}</strong></span></div></div>
      {!ownAccount && <AlertDialog.Root><AlertDialog.Trigger asChild><Button variant="danger" size="sm"><Trash2 size={15}/>Remover</Button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70"/><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><AlertDialog.Title className="text-lg font-semibold">Remover conta de {data.user.name}?</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm leading-6 text-slate-500">O login será excluído. Os leads permanecerão no CRM sem responsável e poderão ser redistribuídos.</AlertDialog.Description><div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="secondary">Cancelar</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button variant="danger" onClick={() => void remove()}>Remover definitivamente</Button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>}
    </div></Card>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Total de leads" value={String(data.stats.totalLeads)}/><Metric label="Leads ativos" value={String(data.stats.activeLeads)}/><Metric label="Fechados" value={String(data.stats.closedLeads)}/><Metric label="MRR gerado" value={money(data.stats.mrr)}/><Metric label="Conversão" value={`${data.stats.conversionRate.toFixed(1)}%`}/></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold">Distribuição por etapa</h3><p className="text-sm text-slate-500">Carteira atual no pipeline.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800">Resposta média: {data.stats.avgResponseTime} min</span></div><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.distribution.map((item) => ({ name: stageLabels[item.stage] || item.stage, total: item.total }))} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.18}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: "rgba(148,163,184,.08)" }}/><Bar dataKey="total" name="Leads" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={22}/></BarChart></ResponsiveContainer></div></Card><Card className="p-6"><div className="flex items-center gap-2"><UserRound className="text-brand-600"/><div><h3 className="text-lg font-semibold">Histórico de acesso</h3><p className="text-sm text-slate-500">Últimas ações desta conta.</p></div></div><div className="mt-5"><UserActivityLog userId={params.id}/></div></Card></div>
    <UserFormModal open={editing} user={managedUser} activeAdminCount={activeAdminCount} onOpenChange={setEditing} onSuccess={refresh}/>
    <ResetPasswordModal open={resetting} user={managedUser} onOpenChange={setResetting} onSuccess={refresh}/>
    <TransferLeadsModal open={transferring} user={managedUser} destinations={destinations} onOpenChange={setTransferring} onSuccess={refresh}/>
  </>;
}
