"use client";
// Modal validado para criação e edição de contas, com checagem de e-mail em tempo real.
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import type { ManagedUser, UserRole } from "./types";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "CORRETOR"]),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, context) => {
  if (data.password && (data.password.length < 8 || !/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password))) context.addIssue({ code: "custom", path: ["password"], message: "Use 8+ caracteres, uma maiúscula e um número" });
  if (data.password !== data.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "As senhas não coincidem" });
});

type FormValues = z.infer<typeof schema>;
type Props = {
  open: boolean;
  user?: ManagedUser;
  activeAdminCount: number;
  onOpenChange(open: boolean): void;
  onSuccess(): Promise<void> | void;
};

export function UserFormModal({ open, user, activeAdminCount, onOpenChange, onSuccess }: Props) {
  const editing = Boolean(user);
  const [showPassword, setShowPassword] = useState(false);
  const [emailState, setEmailState] = useState<"idle" | "checking" | "available" | "used">("idle");
  const defaults = useMemo<FormValues>(() => ({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "", role: user?.role || "CORRETOR", password: "", confirmPassword: "" }), [user]);
  const { register, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const email = watch("email");
  const role = watch("role") as UserRole;

  useEffect(() => { if (open) reset(defaults); }, [defaults, open, reset]);
  useEffect(() => {
    if (!open || !z.string().email().safeParse(email).success || email.toLowerCase() === user?.email.toLowerCase()) { setEmailState("idle"); return; }
    const controller = new AbortController();
    setEmailState("checking");
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/users?search=${encodeURIComponent(email)}`, { signal: controller.signal });
        const data = await response.json() as { users?: ManagedUser[] };
        setEmailState(data.users?.some((item) => item.id !== user?.id && item.email.toLowerCase() === email.toLowerCase()) ? "used" : "available");
      } catch { if (!controller.signal.aborted) setEmailState("idle"); }
    }, 500);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [email, open, user]);

  async function submit(values: FormValues) {
    if (!editing && !values.password) { setError("password", { message: "Senha é obrigatória" }); return; }
    if (emailState === "used") { setError("email", { message: "Este e-mail já está cadastrado" }); return; }
    const response = await fetch(editing ? `/api/admin/users/${user!.id}` : "/api/admin/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { name: values.name, email: values.email, phone: values.phone || null, role: values.role } : { name: values.name, email: values.email, phone: values.phone || null, role: values.role, password: values.password }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { toast.error(result.error || "Não foi possível salvar o usuário."); return; }
    toast.success(editing ? "Corretor atualizado." : "Novo acesso criado com sucesso.");
    onOpenChange(false);
    await onSuccess();
  }

  const cannotDemote = editing && user?.role === "ADMIN" && user.active && activeAdminCount <= 1;
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:p-8">
    <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-2xl font-semibold">{editing ? "Editar corretor" : "Novo corretor"}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">{editing ? "Atualize os dados e permissões desta conta." : "Crie um novo login de acesso ao CRM."}</Dialog.Description></div><Dialog.Close className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20}/></Dialog.Close></div>
    <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Nome completo *<input {...register("name")} className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3 outline-none focus:border-brand-500"/>{errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}</label>
        <label className="text-sm font-medium">Telefone<input {...register("phone")} className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3 outline-none focus:border-brand-500" placeholder="(22) 99999-9999"/></label>
      </div>
      <label className="block text-sm font-medium">E-mail corporativo *<input {...register("email")} type="email" className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3 outline-none focus:border-brand-500"/><span className={`mt-1 block text-xs ${emailState === "used" ? "text-red-600" : "text-slate-500"}`}>{errors.email?.message || (emailState === "checking" ? "Verificando disponibilidade..." : emailState === "available" ? "E-mail disponível" : emailState === "used" ? "Este e-mail já está cadastrado" : "")}</span></label>
      <fieldset><legend className="text-sm font-medium">Nível de acesso</legend><div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label title={cannotDemote ? "Deve existir ao menos um administrador ativo" : undefined} className={`rounded-xl border p-4 transition ${cannotDemote ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${role === "CORRETOR" ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "dark:border-slate-700"}`}><input {...register("role")} type="radio" value="CORRETOR" disabled={cannotDemote} className="sr-only"/><strong className="text-sm">Corretor</strong><p className="mt-1 text-xs leading-5 text-slate-500">Acesso às próprias leads e funcionalidades do CRM.</p></label>
        <label className={`cursor-pointer rounded-xl border p-4 transition ${role === "ADMIN" ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "dark:border-slate-700"}`}><input {...register("role")} type="radio" value="ADMIN" className="sr-only"/><span className="flex items-center gap-2"><strong className="text-sm">Admin</strong><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">USE COM CAUTELA</span></span><p className="mt-1 text-xs leading-5 text-slate-500">Acesso total, incluindo usuários e configurações.</p></label>
      </div>{cannotDemote && <p className="mt-2 flex items-center gap-1 text-xs text-amber-600"><ShieldAlert size={14}/>O último administrador ativo não pode ser rebaixado.</p>}</fieldset>
      {!editing && <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Senha *<span className="relative mt-2 block"><input {...register("password")} type={showPassword ? "text" : "password"} className="h-11 w-full rounded-lg border bg-transparent px-3 pr-10 outline-none focus:border-brand-500"/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span>{errors.password && <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span>}</label>
        <label className="text-sm font-medium">Confirmar senha *<input {...register("confirmPassword")} type={showPassword ? "text" : "password"} className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3 outline-none focus:border-brand-500"/>{errors.confirmPassword && <span className="mt-1 block text-xs text-red-600">{errors.confirmPassword.message}</span>}</label>
      </div>}
      <div className="flex justify-end gap-2 border-t pt-5 dark:border-slate-800"><Dialog.Close asChild><Button type="button" variant="secondary">Cancelar</Button></Dialog.Close><Button disabled={isSubmitting || emailState === "checking" || emailState === "used"}>{isSubmitting ? "Salvando..." : editing ? "Salvar alterações" : "Criar acesso"}</Button></div>
    </form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
