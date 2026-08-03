// Estado vazio reaproveitável para listas sem resultados.
import { Inbox } from "lucide-react";
export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center text-center"><Inbox className="mb-3 text-slate-300" size={34}/><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p></div>;
}

