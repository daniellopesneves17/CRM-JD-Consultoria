"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ContactAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase() || "?";
  return <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-xs font-bold text-white shadow-sm", className)}>
    {src && !failed ? <img src={src} alt={`Foto de ${name}`} className="h-full w-full object-cover" loading="lazy" decoding="async" onError={() => setFailed(true)}/> : initials}
  </span>;
}
