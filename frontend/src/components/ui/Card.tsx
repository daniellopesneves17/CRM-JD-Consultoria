// Card base para métricas e painéis.
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("card transition-colors", className)} {...props} />; }
