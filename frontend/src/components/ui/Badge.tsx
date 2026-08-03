// Badge semântico usado em etapas, status e contadores.
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold", className)} {...props} />;
}

