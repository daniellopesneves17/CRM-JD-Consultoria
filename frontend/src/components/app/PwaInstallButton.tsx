"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (standalone) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><strong>App instalado</strong><p className="mt-1 text-xs opacity-75">O App JD está sendo executado em modo aplicativo.</p></div>;
  if (ios) return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Share2 size={19}/></span><div><strong className="text-sm">Instalar no iPhone</strong><p className="mt-1 text-xs leading-5 text-slate-500">No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div></div></div>;
  return <Button disabled={!prompt} onClick={async () => { if (!prompt) return; await prompt.prompt(); const choice = await prompt.userChoice; if (choice.outcome === "accepted") setPrompt(null); }}><Download size={17}/>{prompt ? "Instalar App JD" : "Instalação disponível pelo navegador"}</Button>;
}
