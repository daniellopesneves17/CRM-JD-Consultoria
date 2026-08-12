"use client";
// Modal de redefinição manual ou geração segura de senha temporária.
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Clipboard, Eye, EyeOff, KeyRound, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { ManagedUser } from "./types";

type Props = { open: boolean; user?: ManagedUser; onOpenChange(open: boolean): void; onSuccess(): Promise<void> | void };
type Mode = "manual" | "generated";

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint32Array(9));
  return `Jd7!${Array.from(values, (value) => alphabet[value % alphabet.length]).join("")}`;
}

export function ResetPasswordModal({ open, user, onOpenChange, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("manual");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (open) { setMode("manual"); setPassword(""); setConfirm(""); setCopied(false); } }, [open, user]);

  function generate() {
    const value = temporaryPassword();
    setMode("generated"); setPassword(value); setConfirm(value); setShow(true); setCopied(false);
  }
  async function copy() {
    await navigator.clipboard.writeText(password); setCopied(true); toast.success("Senha copiada.");
  }
  async function submit() {
    if (!user) return;
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) { toast.error("A senha precisa ter 8+ caracteres, uma maiúscula e um número."); return; }
    if (password !== confirm) { toast.error("As senhas não coincidem."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: mode, password }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { toast.error(result.error || "Não foi possível redefinir a senha."); return; }
      toast.success("Senha redefinida e sessões anteriores invalidadas.");
      onOpenChange(false); await onSuccess();
    } finally { setSubmitting(false); }
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start justify-between"><div><Dialog.Title className="flex items-center gap-2 text-xl font-semibold"><KeyRound className="text-brand-600"/>Redefinir senha</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">{user ? `Nova senha de ${user.name}` : "Selecione um corretor"}</Dialog.Description></div><Dialog.Close className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19}/></Dialog.Close></div>
    <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" onClick={() => { setMode("manual"); setPassword(""); setConfirm(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "manual" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"}`}>Definir manualmente</button><button type="button" onClick={generate} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "generated" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"}`}>Senha temporária</button></div>
    {mode === "generated" && !password ? <Button className="mt-5 w-full" onClick={generate}><WandSparkles size={17}/>Gerar senha temporária</Button> : <div className="mt-5 space-y-4">
      <label className="block text-sm font-medium">Nova senha<span className="relative mt-2 block"><input value={password} onChange={(event) => setPassword(event.target.value)} type={show ? "text" : "password"} className="h-11 w-full rounded-lg border bg-transparent px-3 pr-20 font-mono outline-none focus:border-brand-500"/><span className="absolute right-2 top-1.5 flex"><button type="button" onClick={() => setShow((value) => !value)} className="rounded p-2 text-slate-400" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>{mode === "generated" && <button type="button" onClick={() => void copy()} className="rounded p-2 text-slate-400" aria-label="Copiar senha">{copied ? <Check size={17} className="text-emerald-500"/> : <Clipboard size={17}/>}</button>}</span></span></label>
      {mode === "manual" && <label className="block text-sm font-medium">Confirmar senha<input value={confirm} onChange={(event) => setConfirm(event.target.value)} type={show ? "text" : "password"} className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3 outline-none focus:border-brand-500"/></label>}
      {mode === "generated" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Copie a senha antes de confirmar. O corretor deverá substituí-la por uma senha pessoal no próximo acesso.</div>}
    </div>}
    <div className="mt-6 flex justify-end gap-2 border-t pt-5 dark:border-slate-800"><Dialog.Close asChild><Button variant="secondary">Cancelar</Button></Dialog.Close><Button onClick={() => void submit()} disabled={!password || submitting}>{submitting ? "Redefinindo..." : "Confirmar nova senha"}</Button></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
