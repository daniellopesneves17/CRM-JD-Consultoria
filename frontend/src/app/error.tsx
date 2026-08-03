"use client";
// Error boundary global com recuperação sem recarregar todo o aplicativo.
import { Button } from "@/components/ui/Button";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-screen place-items-center p-6"><div className="card max-w-md p-8 text-center"><h2 className="text-xl font-semibold">Algo não saiu como esperado</h2><p className="mt-2 text-sm text-slate-500">{error.message || "Tente novamente em instantes."}</p><Button className="mt-5" onClick={reset}>Tentar novamente</Button></div></div>;
}

