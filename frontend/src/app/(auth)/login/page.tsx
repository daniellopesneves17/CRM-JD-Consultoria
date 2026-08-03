"use client";
// Tela de acesso com credenciais e feedback de erro.
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, HeartPulse, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
export default function LoginPage() {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [showPassword,setShowPassword]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    setLoading(false); if (result?.error) setError("E-mail ou senha inválidos."); else { router.push("/dashboard"); router.refresh(); }
  }
  return <main className="relative grid min-h-screen lg:grid-cols-[1.1fr_.9fr]"><div className="absolute right-5 top-5 z-10"><ThemeToggle/></div>
    <section className="hidden overflow-hidden bg-slate-950 p-14 text-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600"><HeartPulse/></span><strong className="text-lg">CRM JD</strong></div>
      <div className="my-auto max-w-xl"><p className="label text-blue-300">Relacionamento que converte</p><h1 className="mt-5 text-5xl font-semibold leading-[1.08]">Cada conversa mais humana. Cada oportunidade mais clara.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">Pipeline, WhatsApp e inteligência comercial em um só lugar para sua corretora crescer com método.</p></div>
      <div className="flex items-center gap-3 text-sm text-slate-400"><ShieldCheck className="text-emerald-400"/> Seus dados protegidos e acessíveis somente à equipe.</div>
    </section>
    <section className="grid place-items-center bg-white p-6 transition-colors dark:bg-slate-900"><form onSubmit={submit} className="w-full max-w-sm">
      <div className="mb-9 lg:hidden"><HeartPulse className="text-brand-600" size={36}/></div><p className="label">Bem-vindo de volta</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Acesse sua operação</h2><p className="mt-2 text-sm text-slate-500">Use seu e-mail corporativo para continuar.</p>
      <label className="mt-8 block text-sm font-medium">E-mail<input name="email" type="email" autoComplete="username" required className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-brand-500"/></label>
      <label className="mt-5 block text-sm font-medium">Senha<span className="relative mt-2 block"><input name="password" type={showPassword?"text":"password"} autoComplete="current-password" required className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 outline-none focus:border-brand-500"/><button type="button" onClick={()=>setShowPassword(value=>!value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700" aria-label={showPassword?"Ocultar senha":"Mostrar senha"}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button className="mt-6 w-full" disabled={loading}>{loading ? "Entrando..." : <>Entrar <ArrowRight size={17}/></>}</Button>
      <p className="mt-6 text-center text-xs text-slate-400">Acesso administrativo local.</p>
    </form></section>
  </main>;
}
