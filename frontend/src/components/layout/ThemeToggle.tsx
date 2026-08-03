"use client";
// Alterna e persiste o tema sem depender da conta ou do backend.
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export function ThemeToggle(){
  const [dark,setDark]=useState(false);
  useEffect(()=>setDark(document.documentElement.classList.contains("dark")),[]);
  function toggle(){const next=!dark;setDark(next);document.documentElement.classList.toggle("dark",next);localStorage.setItem("crm-theme",next?"dark":"light");}
  return <button type="button" onClick={toggle} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-blue-300" aria-label={dark?"Ativar modo claro":"Ativar modo escuro"} title={dark?"Modo claro":"Modo escuro"}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>;
}
