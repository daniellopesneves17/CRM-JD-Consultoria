import { Skeleton } from "@/components/ui/Skeleton";

// Feedback imediato durante uma transição ainda não presente no cache do navegador.
export default function DashboardLoading() {
  return <div><Skeleton className="h-8 w-52"/><Skeleton className="mt-3 h-4 w-80 max-w-full"/><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28"/>)}</div></div>;
}
