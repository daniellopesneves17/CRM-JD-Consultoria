// Configurações administrativas da corretora e das integrações.
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
export default function SettingsPage(){return <><div><p className="label">Administração</p><h1 className="mt-1 text-3xl font-semibold">Configurações</h1><p className="mt-1 text-sm text-slate-500">Dados básicos do CRM.</p></div><div className="mt-7 max-w-2xl"><Card className="p-6"><div className="flex items-center gap-3"><Building2 className="text-brand-600"/><h2 className="text-lg font-semibold">Identificação</h2></div><label className="mt-5 block text-sm font-medium">Nome do sistema<input defaultValue="CRM JD" className="mt-2 h-10 w-full rounded-lg border px-3"/></label><Button className="mt-5">Salvar alterações</Button></Card></div></>;}
