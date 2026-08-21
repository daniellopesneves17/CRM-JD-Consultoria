"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import useSWR from "swr";
import { Camera, KeyRound, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { uploadPublicAssetDirect } from "@/lib/direct-public-asset-upload";

type Account = { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null; role: "ADMIN" | "CORRETOR"; lastLoginAt: string | null; loginCount: number; createdAt: string };
const fetcher = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error("Falha ao carregar sua conta."); return response.json(); };

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { data, error, mutate } = useSWR<Account>("/api/me", fetcher);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "profile", name: form.get("name"), phone: form.get("phone") || null }) });
    const body = await response.json();
    setSaving(false); setNotice({ tone: response.ok ? "success" : "error", text: response.ok ? "Dados pessoais atualizados." : body.error || "Não foi possível salvar." });
    if (response.ok) { await mutate(); await update({ name: body.name }); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    if (newPassword !== form.get("confirmPassword")) { setSaving(false); setNotice({ tone: "error", text: "A confirmação da nova senha não coincide." }); return; }
    const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "password", currentPassword: form.get("currentPassword"), newPassword }) });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) { setNotice({ tone: "error", text: body.error || "Não foi possível alterar a senha." }); return; }
    setNotice({ tone: "success", text: "Senha alterada. Entre novamente com a nova senha." });
    window.setTimeout(() => signOut({ callbackUrl: "/login" }), 900);
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0]; if (!file) return;
    setSaving(true); setNotice({ tone: "success", text: "Preparando envio..." });
    try {
      const body = await uploadPublicAssetDirect(file, "/api/me/avatar", (percentage) => setNotice({ tone: "success", text: `Enviando foto... ${percentage}%` }));
      setNotice({ tone: "success", text: "Foto atualizada." });
      await mutate(); await update({ image: body.url });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível enviar a foto." });
    } finally {
      setSaving(false); input.value = "";
    }
  }

  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="label">Preferências pessoais</p><h1 className="mt-1 text-3xl font-semibold">Minha conta</h1><p className="mt-1 text-sm text-slate-500">Gerencie seus dados, foto e segurança.</p></div>{session?.user.role === "ADMIN" && <Link href="/admin/settings" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900"><Settings2 size={16}/>Configurações administrativas</Link>}</div>
    {notice && <div className={`mt-5 rounded-xl border p-3 text-sm ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.text}</div>}
    {error ? <Card className="mt-7 p-6 text-sm text-red-600">Não foi possível carregar sua conta.</Card> : !data ? <div className="mt-7 grid gap-5 lg:grid-cols-2"><Skeleton className="h-96"/><Skeleton className="h-96"/></div> : <div className="mt-7 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <Card className="p-6"><div className="flex items-center gap-4 border-b border-slate-100 pb-5 dark:border-slate-800"><div className="relative"><span className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-xl font-bold text-brand-800">{data.avatarUrl ? <img src={data.avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover"/> : data.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><label className="absolute -bottom-2 -right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-brand-600 text-white shadow" aria-label="Alterar foto (até 20 MB)" title="PNG, JPG ou WebP de até 20 MB"><Camera size={15}/><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} className="hidden"/></label></div><div><h2 className="text-lg font-semibold">{data.name}</h2><p className="text-sm text-slate-500">{data.email}</p><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"><ShieldCheck size={12}/>{data.role === "ADMIN" ? "Administrador" : "Corretor"}</span><p className="mt-2 text-xs text-slate-500">Foto em PNG, JPG ou WebP de até 20 MB.</p></div></div>
        <form onSubmit={saveProfile} className="mt-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium md:col-span-2">Nome completo<input name="name" defaultValue={data.name} required minLength={2} maxLength={120} className="input"/></label><label className="text-sm font-medium">E-mail<input value={data.email} readOnly className="input cursor-not-allowed bg-slate-50 text-slate-500"/></label><label className="text-sm font-medium">Telefone<input name="phone" defaultValue={data.phone || ""} maxLength={30} className="input"/></label><Button disabled={saving} className="md:col-span-2"><UserRound size={16}/>{saving ? "Salvando..." : "Salvar dados pessoais"}</Button></form>
      </Card>
      <Card className="p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><KeyRound size={18}/></span><div><h2 className="font-semibold">Alterar senha</h2><p className="text-xs text-slate-500">A mudança encerra todas as sessões anteriores.</p></div></div><form onSubmit={changePassword} className="mt-6 space-y-4"><label className="block text-sm font-medium">Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required minLength={8} className="input"/></label><label className="block text-sm font-medium">Nova senha<input name="newPassword" type="password" autoComplete="new-password" required minLength={8} className="input"/><span className="mt-1 block text-xs text-slate-500">Use ao menos 8 caracteres, uma letra maiúscula e um número.</span></label><label className="block text-sm font-medium">Confirmar nova senha<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="input"/></label><Button disabled={saving} variant="secondary" className="w-full">{saving ? "Salvando..." : "Alterar senha"}</Button></form><div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-950"><p><b>Último acesso:</b> {data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString("pt-BR") : "Primeiro acesso"}</p><p className="mt-1"><b>Total de logins:</b> {data.loginCount}</p></div></Card>
    </div>}
  </>;
}
