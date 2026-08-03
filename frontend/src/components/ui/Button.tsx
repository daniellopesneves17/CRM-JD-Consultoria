// Botão base inspirado no shadcn/ui, com variantes consistentes e foco acessível.
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export const Button = forwardRef<HTMLButtonElement, Props>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button ref={ref} className={cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-brand-600 text-white hover:bg-brand-500",
    variant === "secondary" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    variant === "danger" && "bg-danger text-white hover:bg-red-700", className
  )} {...props} />
));
Button.displayName = "Button";
