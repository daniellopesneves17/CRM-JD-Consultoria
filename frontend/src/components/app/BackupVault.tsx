"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { Archive, ArrowLeft, Download, Eye, FileLock2, LoaderCircle, LockKeyhole, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type BackupItem = { path: string; name: string; size: number; createdAt: string; conversationCount: number; messageCount: number };
type BackupList = { owner: { id: string; name: string }; items: BackupItem[] };
type ArchiveItem = { id: string; lead: { id: string; name: string; phone: string; avatarUrl: string | null }; status: string; sentiment: string; isUrgent: boolean; updatedAt: string; messageCount: number; preview: string };
type ArchiveSummary = { backup: { exportedAt: string; owner: { id: string; name: string }; conversationCount: number; messageCount: number }; items: ArchiveItem[]; total: number; page: number; pages: number };
type ArchivedConversation = { id: string; lead: ArchiveItem["lead"]; messages: Message[]; updatedAt: string };

const fetcher = async <T,>(url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível carregar os backups.");
  return body;
};

function sizeLabel(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function BackupVault({ ownerId }: { ownerId?: string }) {
  const endpoint = ownerId ? `/api/whatsapp-backups?ownerId=${encodeURIComponent(ownerId)}` : "/api/whatsapp-backups";
  const { data, error, isLoading, mutate } = useSWR<BackupList>(endpoint, fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlockItem, setUnlockItem] = useState<BackupItem | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [archive, setArchive] = useState<ArchiveSummary | null>(null);
  const [archivePassword, setArchivePassword] = useState("");
  const [archivePath, setArchivePath] = useState("");
  const [query, setQuery] = useState("");
  const [archivedConversation, setArchivedConversation] = useState<ArchivedConversation | null>(null);

  const visibleItems = archive?.items ?? [];

  async function createBackup(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    if (createPassword !== confirmPassword) return setActionError("As senhas não conferem.");
    setWorking(true);
    const response = await fetch("/api/whatsapp-backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: createPassword, ...(ownerId ? { ownerId } : {}) }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setActionError(body.error || "Não foi possível criar o backup.");
    else { setCreateOpen(false); setCreatePassword(""); setConfirmPassword(""); await mutate(); }
    setWorking(false);
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (!unlockItem) return;
    setWorking(true); setActionError("");
    const response = await fetch("/api/whatsapp-backups/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: unlockItem.path, password: unlockPassword, ...(ownerId ? { ownerId } : {}) }) });
    const body = await response.json().catch(() => ({})) as ArchiveSummary & { error?: string };
    if (!response.ok) setActionError(body.error || "Não foi possível abrir o backup.");
    else { setArchive(body); setArchivePassword(unlockPassword); setArchivePath(unlockItem.path); setUnlockItem(null); setUnlockPassword(""); }
    setWorking(false);
  }

  async function openConversation(id: string) {
    setWorking(true); setActionError("");
    const response = await fetch("/api/whatsapp-backups/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: archivePath, password: archivePassword, conversationId: id, ...(ownerId ? { ownerId } : {}) }) });
    const body = await response.json().catch(() => ({})) as { conversation?: ArchivedConversation; error?: string };
    if (!response.ok || !body.conversation) setActionError(body.error || "Não foi possível abrir a conversa.");
    else setArchivedConversation(body.conversation);
    setWorking(false);
  }

  async function loadArchivePage(page: number, append: boolean) {
    if (!archivePath || !archivePassword) return;
    setWorking(true); setActionError("");
    const response = await fetch("/api/whatsapp-backups/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: archivePath, password: archivePassword, query, page, ...(ownerId ? { ownerId } : {}) }) });
    const body = await response.json().catch(() => ({})) as ArchiveSummary & { error?: string };
    if (!response.ok) setActionError(body.error || "Não foi possível pesquisar no backup.");
    else setArchive((current) => append && current ? { ...body, items: [...current.items, ...body.items] } : body);
    setWorking(false);
  }

  async function remove(item: BackupItem) {
    if (!window.confirm("Excluir permanentemente este arquivo de backup?")) return;
    setWorking(true); setActionError("");
    const params = new URLSearchParams({ path: item.path }); if (ownerId) params.set("ownerId", ownerId);
    const response = await fetch(`/api/whatsapp-backups?${params.toString()}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setActionError(body.error || "Não foi possível excluir o backup."); else await mutate();
    setWorking(false);
  }

  if (archive) return <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900 sm:gap-3 sm:px-4"><button type="button" onClick={() => { setArchive(null); setArchivedConversation(null); setArchivePassword(""); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Voltar aos backups"><ArrowLeft size={19}/></button><div className="min-w-0 flex-1"><strong className="block truncate text-sm">Arquivo de {archive.backup.owner.name}</strong><p className="truncate text-[11px] text-slate-500">Criado em {dateLabel(archive.backup.exportedAt)} · somente leitura</p></div><span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 sm:inline-flex"><ShieldCheck size={12}/>Descriptografado nesta sessão</span></header>
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className={cn("w-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:flex md:w-[320px] lg:w-[360px]", archivedConversation ? "hidden" : "flex")}><div className="border-b border-slate-200 p-3 dark:border-slate-800"><form onSubmit={(event) => { event.preventDefault(); void loadArchivePage(1, false); }} className="relative flex gap-2"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Buscar no backup" inputMode="search"/><button className="h-11 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white dark:bg-blue-600">Buscar</button></form><p className="mt-2 text-[10px] text-slate-400">{archive.total.toLocaleString("pt-BR")} encontradas · {archive.backup.messageCount.toLocaleString("pt-BR")} mensagens no arquivo</p></div><div className="scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">{visibleItems.map((item) => <button key={item.id} type="button" onClick={() => void openConversation(item.id)} className="flex min-h-[76px] w-full gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{item.lead.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-sm">{item.lead.name}</strong><time className="text-[10px] text-slate-400">{new Date(item.updatedAt).toLocaleDateString("pt-BR")}</time></span><span className="mt-1 block truncate text-xs text-slate-500">{item.preview}</span><span className="mt-1 block text-[10px] text-slate-400">{item.messageCount} mensagens</span></span></button>)}{archive.page < archive.pages && <div className="p-3"><button type="button" disabled={working} onClick={() => void loadArchivePage(archive.page + 1, true)} className="h-11 w-full rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">{working ? "Carregando..." : "Carregar mais"}</button></div>}</div></aside>
      <section className={cn("min-w-0 flex-1 flex-col bg-[#efeae2] dark:bg-[#07101f] md:flex", archivedConversation ? "flex" : "hidden")}>
        {archivedConversation ? <><header className="flex min-h-16 items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4"><button type="button" onClick={() => setArchivedConversation(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"><ArrowLeft size={18}/></button><div className="min-w-0"><strong className="block truncate text-sm">{archivedConversation.lead.name}</strong><p className="truncate text-[11px] text-slate-500">{archivedConversation.lead.phone} · conversa arquivada</p></div></header><div className="scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-2.5 py-3 sm:px-6 sm:py-4"><div className="mx-auto max-w-3xl space-y-2">{archivedConversation.messages.map((message) => <MessageBubble key={message.id} message={message}/>)}</div></div><footer className="border-t border-slate-200 bg-white px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900"><LockKeyhole size={13} className="mr-1 inline"/>Backup somente para consulta — nenhuma mensagem pode ser enviada.</footer></> : <div className="grid flex-1 place-items-center p-8 text-center"><div><Archive className="mx-auto text-slate-300" size={42}/><strong className="mt-3 block text-sm">Selecione uma conversa arquivada</strong><p className="mt-1 text-xs text-slate-500">O conteúdo é exibido em modo somente leitura.</p></div></div>}
      </section>
    </div>
  </div>;

  return <div className="scrollbar h-full touch-pan-y overflow-y-auto overscroll-contain bg-slate-50 px-3 py-4 pb-8 dark:bg-slate-950 sm:px-6 sm:py-5"><div className="mx-auto max-w-4xl"><div className="flex items-start justify-between gap-3 sm:gap-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">Cofre JD</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">Backups do WhatsApp</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Conversas protegidas por senha, preservadas para consulta dentro do App JD.</p></div><Button onClick={() => { setCreateOpen(true); setActionError(""); }} className="min-h-11 shrink-0" aria-label="Criar backup"><Plus size={17}/><span className="hidden sm:inline">Criar backup</span></Button></div>
    <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><FileLock2 className="text-blue-600" size={20}/><strong className="mt-3 block text-sm">AES-256-GCM</strong><p className="mt-1 text-xs text-slate-500">Criptografia forte antes do envio ao Storage.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><LockKeyhole className="text-emerald-600" size={20}/><strong className="mt-3 block text-sm">Senha privada</strong><p className="mt-1 text-xs text-slate-500">A JD não armazena nem consegue recuperar sua senha.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><Eye className="text-violet-600" size={20}/><strong className="mt-3 block text-sm">Somente leitura</strong><p className="mt-1 text-xs text-slate-500">Abrir um backup nunca altera o WhatsApp atual.</p></div></div>
    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">O arquivo preserva mensagens e metadados. Imagens, áudios e documentos permanecem referenciados à integração atual e podem depender da disponibilidade da mídia na origem.</p>
    {actionError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{actionError}</p>}
    <div className="mt-6 space-y-3">{isLoading && <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-blue-600"/></div>}{error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}{data?.items.map((item) => <article key={item.path} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-blue-600"><FileLock2 size={22}/></span><div className="min-w-0 flex-1"><strong className="block text-sm">Backup de {dateLabel(item.createdAt)}</strong><p className="mt-1 text-xs text-slate-500">{item.conversationCount.toLocaleString("pt-BR")} conversas · {item.messageCount.toLocaleString("pt-BR")} mensagens · {sizeLabel(item.size)}</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => { setUnlockItem(item); setUnlockPassword(""); setActionError(""); }} className="min-h-11"><Eye size={15}/>Abrir</Button><a href={`${endpoint}${endpoint.includes("?") ? "&" : "?"}download=${encodeURIComponent(item.path)}`} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700" title="Baixar arquivo" aria-label="Baixar arquivo"><Download size={16}/></a><button type="button" onClick={() => void remove(item)} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600 dark:border-slate-700" title="Excluir backup" aria-label="Excluir backup"><Trash2 size={16}/></button></div></article>)}{data && data.items.length === 0 && <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><div><Archive className="mx-auto text-slate-300" size={38}/><strong className="mt-3 block text-sm">Nenhum backup criado</strong><p className="mt-1 text-xs text-slate-500">Crie o primeiro arquivo criptografado desta conta.</p></div></div>}</div></div>
    {(createOpen || unlockItem) && <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-slate-950/70 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-4"><form onSubmit={createOpen ? createBackup : unlock} className="jd-backup-modal scrollbar max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-blue-600">{createOpen ? "Novo backup" : "Abrir arquivo"}</p><h2 className="mt-1 text-xl font-bold">{createOpen ? "Proteja suas conversas" : "Digite a senha do backup"}</h2></div><button type="button" onClick={() => { setCreateOpen(false); setUnlockItem(null); setActionError(""); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar modal"><X size={18}/></button></div><p className="mt-3 text-sm leading-6 text-slate-500">{createOpen ? "A senha será usada apenas para criptografar o arquivo. Guarde-a em local seguro: ela não poderá ser recuperada." : "A descriptografia acontece temporariamente no servidor e o conteúdo não é salvo aberto."}</p><label className="mt-5 block text-sm font-semibold">Senha<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={createOpen ? createPassword : unlockPassword} onChange={(event) => createOpen ? setCreatePassword(event.target.value) : setUnlockPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-base dark:border-slate-700 dark:bg-slate-950" placeholder="Mínimo de 10 caracteres"/></label>{createOpen && <label className="mt-3 block text-sm font-semibold">Confirmar senha<input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-base dark:border-slate-700 dark:bg-slate-950"/></label>}{actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}<Button className="mt-5 min-h-12 w-full" disabled={working}>{working ? <LoaderCircle className="animate-spin" size={17}/> : <LockKeyhole size={17}/>} {working ? "Processando..." : createOpen ? "Criptografar e guardar" : "Desbloquear backup"}</Button></form></div>}
  </div>;
}
