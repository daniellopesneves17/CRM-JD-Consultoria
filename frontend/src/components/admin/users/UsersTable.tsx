"use client";
// Tabela de corretores com navegação, status confirmado e ações administrativas.
import Link from "next/link";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle, KeyRound, Pencil, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ManagedUser } from "./types";

type Props = {
  users: ManagedUser[];
  currentUserId?: string;
  onEdit(user: ManagedUser): void;
  onReset(user: ManagedUser): void;
  onTransfer(user: ManagedUser): void;
  onToggle(user: ManagedUser): Promise<void>;
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function relativeTime(value: string | null) {
  if (!value) return "Nunca acessou";
  const milliseconds = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

function isStale(value: string | null) {
  return !value || Date.now() - new Date(value).getTime() > 30 * 24 * 60 * 60 * 1000;
}

export function UsersTable({ users, currentUserId, onEdit, onReset, onTransfer, onToggle }: Props) {
  if (!users.length) return <div className="p-10 text-center text-sm text-slate-500">Nenhum usuário encontrado.</div>;
  return <div className="scrollbar overflow-x-auto">
    <table className="w-full min-w-[980px] border-collapse text-left">
      <thead className="border-b bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
        <tr>{["Corretor", "Role", "Leads ativos", "Último acesso", "Status", "Ações"].map((heading) => <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {users.map((user) => {
          const ownAccount = user.id === currentUserId;
          const stale = isStale(user.lastLoginAt);
          return <tr key={user.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
            <td className="px-5 py-4">
              <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"/> : <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">{initials(user.name)}</span>}
                <span><strong className="block text-sm text-slate-900 dark:text-white">{user.name}</strong><span className="text-xs text-slate-500">{user.email}</span></span>
              </Link>
            </td>
            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.role === "ADMIN" ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{user.role === "ADMIN" ? "Admin" : "Corretor"}</span></td>
            <td className="px-5 py-4 text-sm font-semibold">{user.activeLeads}</td>
            <td className={`px-5 py-4 text-sm ${stale ? "font-medium text-amber-600" : "text-slate-600 dark:text-slate-300"}`}><span className="inline-flex items-center gap-1.5">{stale && <AlertTriangle size={15}/>} {relativeTime(user.lastLoginAt)}</span></td>
            <td className="px-5 py-4">
              <AlertDialog.Root>
                <AlertDialog.Trigger asChild>
                  <button type="button" role="switch" aria-checked={user.active} disabled={ownAccount} title={ownAccount ? "Sua própria conta não pode ser desativada" : undefined} className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${user.active ? "bg-emerald-500" : "bg-red-500"}`}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${user.active ? "left-6" : "left-1"}`}/>
                  </button>
                </AlertDialog.Trigger>
                <AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"/><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <AlertDialog.Title className="text-lg font-semibold">{user.active ? "Desativar conta" : "Ativar conta"}</AlertDialog.Title>
                  <AlertDialog.Description className="mt-2 text-sm leading-6 text-slate-500">{user.active ? `${user.name} perderá o acesso imediatamente. Os dados e ${user.activeLeads} leads ativos serão preservados.` : `${user.name} poderá voltar a acessar o CRM.`}</AlertDialog.Description>
                  <div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="secondary">Cancelar</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button variant={user.active ? "danger" : "primary"} onClick={() => void onToggle(user)}>Confirmar</Button></AlertDialog.Action></div>
                </AlertDialog.Content></AlertDialog.Portal>
              </AlertDialog.Root>
              <span className={`ml-2 text-xs font-semibold ${user.active ? "text-emerald-600" : "text-red-600"}`}>{user.active ? "Ativo" : "Inativo"}</span>
            </td>
            <td className="px-5 py-4"><div className="flex items-center gap-1">
              <button type="button" onClick={() => onEdit(user)} disabled={ownAccount} title={ownAccount ? "A conta em uso não pode ser editada aqui" : "Editar"} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30 dark:hover:bg-slate-800"><Pencil size={17}/></button>
              <button type="button" onClick={() => onReset(user)} disabled={ownAccount} title="Redefinir senha" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30 dark:hover:bg-slate-800"><KeyRound size={17}/></button>
              <button type="button" onClick={() => onTransfer(user)} title="Transferir carteira" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800"><Repeat2 size={17}/></button>
            </div></td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
