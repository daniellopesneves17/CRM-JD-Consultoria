import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, LockKeyhole, MessageCircle, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Baixar App JD Consultoria",
  description: "Baixe o aplicativo oficial da JD Consultoria para Android.",
};

export default function DownloadAppPage() {
  return <main className="min-h-[100dvh] bg-slate-950 px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-white sm:px-6">
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl flex-col">
      <header className="flex items-center justify-between gap-4">
        <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"><ArrowLeft size={17}/>Entrar no CRM</Link>
        <span className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">Aplicativo oficial</span>
      </header>

      <section className="my-auto grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-blue-950/40">
            <Image src="/jd-logo.png" alt="Logo JD Consultoria" fill sizes="80px" className="object-cover" priority/>
          </span>
          <p className="mt-8 text-sm font-bold uppercase tracking-[.18em] text-blue-300">JD Consultoria</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Seu atendimento WhatsApp em um app de verdade.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Instale no celular, abra pelo ícone da JD e acesse conversas e backups protegidos sem entrar pelo painel do CRM.</p>
          <a href="/downloads/app-jd-android.apk" download className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 text-base font-bold shadow-xl shadow-blue-950/30 transition hover:bg-blue-500 sm:w-auto"><Download size={20}/>Baixar para Android</a>
          <p className="mt-3 text-xs leading-5 text-slate-400">Android 7 ou mais recente. Na primeira instalação, o aparelho pode pedir autorização para instalar este arquivo.</p>
        </div>

        <div className="grid gap-3">
          <Feature icon={Smartphone} title="Aplicativo independente" text="Ícone próprio e abertura em tela cheia, diretamente no App JD."/>
          <Feature icon={MessageCircle} title="WhatsApp conectado" text="As mesmas conversas sincronizadas pela integração segura do CRM."/>
          <Feature icon={LockKeyhole} title="Dados protegidos" text="Login individual e separação das conversas e backups por corretor."/>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm leading-6 text-slate-400">
            <strong className="block text-white">iPhone e iPad</strong>
            A versão para a App Store exige assinatura em uma conta Apple Developer. O projeto será preparado separadamente para publicação no iOS.
          </div>
        </div>
      </section>
    </div>
  </main>;
}

function Feature({ icon: Icon, title, text }: { icon: typeof Smartphone; title: string; text: string }) {
  return <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Icon size={20}/></span>
    <div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{text}</p></div>
  </div>;
}
