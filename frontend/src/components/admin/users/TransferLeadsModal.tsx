"use client";
// Modal de transferência de carteira com seleção, prévia e confirmação explícita.
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { ArrowRight, Repeat2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ManagedUser, TransferFilter, TransferPreview, UserProfileResponse } from "./types";

type Props = { open: boolean; user?: ManagedUser; destinations: ManagedUser[]; onOpenChange(open: boolean): void; onSuccess(): Promise<void> | void };
const labels: Record<TransferFilter, string> = { all: "Todos os leads", active: "Apenas leads ativos", open: "Apenas leads abertos" };

export function TransferLeadsModal({ open, user, destinations, onOpenChange, onSuccess }: Props) {
  const [targetUserId, setTargetUserId] = useState("");
  const [filter, setFilter] = useState<TransferFilter>("active");
  const [registerHistory, setRegisterHistory] = useState(true);
  const [preview, setPreview] = useState<TransferPreview>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!open || !user) return;
    setTargetUserId(""); setFilter("active"); setRegisterHistory(true); setPreview(undefined); setLoading(true);
    const controller = new AbortController();
    fetch(`/api/admin/users/${user.id}`, { signal: controller.signal }).then((response) => response.json()).then((data: UserProfileResponse) => setPreview(data.transferPreview)).catch(() => undefined).finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, user]);
  const target = useMemo(() => destinations.find((item) => item.id === targetUserId), [destinations, targetUserId]);
  const selected = preview?.[filter];
  async function transfer() {
    if (!user || !target) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/transfer-leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: target.id, filter, registerHistory }) });
      const result = await response.json().catch(() => ({})) as { transferred?: number; error?: string };
      if (!response.ok) { toast.error(result.error || "Não foi possível transferir a carteira."); return; }
      toast.success(`${result.transferred || 0} leads transferidos para ${target.name}.`);
      onOpenChange(false); await onSuccess();
    } finally { setSubmitting(false); }
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start justify-between"><div><Dialog.Title className="flex items-center gap-2 text-xl font-semibold"><Repeat2 className="text-brand-600"/>Transferir carteira</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">{user ? `Redistribua os leads de ${user.name}.` : "Selecione um corretor"}</Dialog.Description></div><Dialog.Close className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19}/></Dialog.Close></div>
    {loading ? <Skeleton className="mt-6 h-80"/> : <div className="mt-6 space-y-5">
      <label className="block text-sm font-medium">Destino<select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3"><option value="">Selecione um corretor ativo</option>{destinations.filter((item) => item.id !== user?.id).map((item) => <option key={item.id} value={item.id}>{item.name} — {item.activeLeads} leads ativos</option>)}</select></label>
      <fieldset><legend className="text-sm font-medium">Quais leads transferir</legend><div className="mt-2 space-y-2">{(["all", "active", "open"] as const).map((value) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${filter === value ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "dark:border-slate-700"}`}><input type="radio" checked={filter === value} onChange={() => setFilter(value)}/><span className="text-sm"><strong>{labels[value]}</strong><span className="ml-1 text-slate-500">({preview?.[value].count || 0})</span></span></label>)}</div></fieldset>
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"><input type="checkbox" checked={registerHistory} onChange={(event) => setRegisterHistory(event.target.checked)} className="mt-0.5"/><span><strong className="block">Manter histórico</strong><span className="text-xs text-slate-500">Registrar a transferência no histórico de cada lead.</span></span></label>
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/20"><p className="text-sm font-semibold">Prévia da transferência</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Você está transferindo <strong>{selected?.count || 0} leads</strong> de {user?.name || "—"} para {target?.name || "selecione o destino"}.</p>{selected?.samples.length ? <ul className="mt-3 space-y-1 text-xs text-slate-500">{selected.samples.map((lead) => <li key={lead.id}>• {lead.name} <span className="text-slate-400">({lead.stage.replaceAll("_", " ")})</span></li>)}{selected.count > selected.samples.length && <li>… e mais {selected.count - selected.samples.length}</li>}</ul> : <p className="mt-3 text-xs text-slate-500">Nenhum lead neste filtro.</p>}</div>
    </div>}
    <div className="mt-6 flex justify-end gap-2 border-t pt-5 dark:border-slate-800"><Dialog.Close asChild><Button variant="secondary">Cancelar</Button></Dialog.Close><AlertDialog.Root><AlertDialog.Trigger asChild><Button disabled={!target || !selected?.count || submitting}><ArrowRight size={16}/>Revisar transferência</Button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/70"/><AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><AlertDialog.Title className="text-lg font-semibold">Confirmar transferência?</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm leading-6 text-slate-500">Esta ação moverá {selected?.count || 0} leads de {user?.name} para {target?.name}. O histórico será {registerHistory ? "preservado" : "omitido por sua escolha"}.</AlertDialog.Description><div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="secondary">Voltar</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button onClick={() => void transfer()} disabled={submitting}>{submitting ? "Transferindo..." : "Confirmar"}</Button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
