// Traduz temperatura comercial em ícone, texto e cor.
import { Badge } from "@/components/ui/Badge";
import { Temperature } from "@/types";
const style = { FRIO: "bg-sky-50 text-sky-700", MORNO: "bg-amber-50 text-amber-700", QUENTE: "bg-red-50 text-red-700" };
const label = { FRIO: "❄ Frio", MORNO: "◐ Morno", QUENTE: "● Quente" };
export function TemperatureBadge({ value }: { value: Temperature }) { return <Badge className={style[value]}>{label[value]}</Badge>; }

