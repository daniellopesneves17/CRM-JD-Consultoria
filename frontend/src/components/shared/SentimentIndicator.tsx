// Indicador compacto de sentimento da conversa.
import { cn } from "@/lib/utils";
const map = { POSITIVO: ["bg-emerald-500", "Positivo"], NEUTRO: ["bg-slate-400", "Neutro"], FRUSTRADO: ["bg-orange-500", "Frustrado"], URGENTE: ["bg-red-500", "Urgente"] };
export function SentimentIndicator({ value }: { value: keyof typeof map }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><span className={cn("h-2 w-2 rounded-full", map[value][0])}/>{map[value][1]}</span>;
}

