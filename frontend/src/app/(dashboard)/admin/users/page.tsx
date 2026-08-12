"use client";
// Gestão central de acessos: resumo, filtros, criação e ações sobre corretores.
import { useDeferredValue, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { AlertTriangle, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { Toaster, toast } from "sonner";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { ResetPasswordModal } from "@/components/admin/users/ResetPasswordModal";
import { TransferLeadsModal } from "@/components/admin/users/TransferLeadsModal";
import type { ManagedUser } from "@/components/admin/users/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Falha ao carregar usuários."); return response.json(); };
type UsersResponse = { users: ManagedUser[]; total: number };

function SummaryCard({ icon: Icon, label, value, warning = false }: { icon: typeof Users; label: string; value: number; warning?: boolean }) {
  return <Card className="flex items-center gap-4 p-5"><span className={`grid h-12 w-12 place-items-center rounded-xl ${warning ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"}`}><Icon size={22}/></span><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div></Card>;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { data, error, mutate } = useSWR<UsersResponse>("/api/admin/users", fetcher);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ManagedUser>();
  const [resetting, setResetting] = useState<ManagedUser>();
  const [transferring, setTransferring] = useState<ManagedUser>();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("TODOS");
  const [status, setStatus] = useState("TODOS");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const users = data?.users || [];
  const brokers = users.filter((user) => user.role === "CORRETOR");
  const now = Date.now();
  const recent = brokers.filter((user) => user.lastLoginAt && now - new Date(user.lastLoginAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  const stale = brokers.filter((user) => !user.lastLoginAt || now - new Date(user.lastLoginAt).getTime() > 30 * 24 * 60 * 60 * 1000).length;
  const filtered = useMemo(() => users.filter((user) => (!deferredSearch || `${user.name} ${user.email}`.toLowerCase().includes(deferredSearch)) && (role === "TODOS" || user.role === role) && (status === "TODOS" || user.active === (status === "ATIVOS"))), [deferredSearch, role, status, users]);
  const activeAdminCount = users.filter((user) => user.role === "ADMIN" && user.active).length;
  const destinations = users.filter((user) => user.role === "CORRETOR" && user.active && user.crmEnabled !== false);

  async function toggle(user: ManagedUser) {
    const response = await fetch(`/api/admin/users/${user.id}/toggle-active`, { method: "PATCH" });
    const result = await response.json().catch(() => ({})) as { error?: string; active?: boolean; activeLeads?: number };
    if (!response.ok) { toast.error(result.error || "Não foi possível alterar o status."); return; }
    toast.success(result.active ? "Conta ativada." : `Conta desativada; ${result.activeLeads || 0} leads foram preservados.`);
    await mutate();
  }

  return <>
    <Toaster richColors position="top-right"/>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="label">Gestão de acessos</p><h2 className="mt-1 text-3xl font-semibold">Corretores</h2><p className="mt-2 text-sm text-slate-500">Gerencie todos os acessos ao CRM.</p></div><Button onClick={() => setCreating(true)}><UserPlus size={17}/>Novo corretor</Button></div>
    {data ? <div className="mt-7 grid gap-4 md:grid-cols-3"><SummaryCard icon={UserCheck} label="Corretores ativos" value={brokers.filter((user) => user.active).length}/><SummaryCard icon={Users} label="Login nos últimos 7 dias" value={recent}/><SummaryCard icon={AlertTriangle} label="Sem acesso há mais de 30 dias" value={stale} warning/></div> : <div className="mt-7 grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24"/>)}</div>}
    <Card className="mt-7 overflow-hidden"><div className="flex flex-wrap gap-3 border-b p-4 dark:border-slate-800"><label className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome ou e-mail" className="h-10 w-full rounded-lg border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-brand-500"/></label><select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-lg border bg-transparent px-3 text-sm"><option value="TODOS">Todas as roles</option><option value="CORRETOR">Corretores</option><option value="ADMIN">Admins</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border bg-transparent px-3 text-sm"><option value="TODOS">Todos os status</option><option value="ATIVOS">Ativos</option><option value="INATIVOS">Inativos</option></select></div>{error ? <div className="p-8 text-center text-sm text-red-600">Não foi possível carregar os corretores.</div> : data ? <UsersTable users={filtered} currentUserId={session?.user.id} onEdit={setEditing} onReset={setResetting} onTransfer={setTransferring} onToggle={toggle}/> : <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16"/>)}</div>}</Card>
    <UserFormModal open={creating} activeAdminCount={activeAdminCount} onOpenChange={setCreating} onSuccess={async () => { await mutate(); }}/>
    <UserFormModal open={Boolean(editing)} user={editing} activeAdminCount={activeAdminCount} onOpenChange={(open) => !open && setEditing(undefined)} onSuccess={async () => { await mutate(); }}/>
    <ResetPasswordModal open={Boolean(resetting)} user={resetting} onOpenChange={(open) => !open && setResetting(undefined)} onSuccess={async () => { await mutate(); }}/>
    <TransferLeadsModal open={Boolean(transferring)} user={transferring} destinations={destinations} onOpenChange={(open) => !open && setTransferring(undefined)} onSuccess={async () => { await mutate(); }}/>
  </>;
}
