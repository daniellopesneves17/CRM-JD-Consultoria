// Loading global para transições entre páginas.
import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() { return <div className="p-8"><Skeleton className="h-8 w-52"/><div className="mt-6 grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32"/>)}</div></div>; }

