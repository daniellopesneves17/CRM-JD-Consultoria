"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Archive,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { BackupVault } from "@/components/app/BackupVault";
import { PwaInstallButton } from "@/components/app/PwaInstallButton";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { ConversationList } from "@/components/inbox/ConversationList";
import { useConversations } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

type Tab = "chats" | "backups" | "settings";
type CrmUser = { id: string; name: string; email: string; active: boolean; crmEnabled: boolean; whatsappConnected: boolean };

const fetcher = async <T,>(url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar os CRMs.");
  return response.json() as Promise<T>;
};

export function JdMobileApp() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("chats");
  const [online, setOnline] = useState(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [androidApp, setAndroidApp] = useState(false);
  const { data: crmData } = useSWR<{ users: CrmUser[] }>(isAdmin ? "/api/admin/crm" : null, fetcher);
  const ownerId = isAdmin ? selectedOwnerId : undefined;
  const inbox = useConversations(ownerId);

  useEffect(() => {
    setAndroidApp(new URLSearchParams(window.location.search).get("platform") === "android");
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const needsOwner = isAdmin && !selectedOwnerId;
  const activeOwner = crmData?.users.find((user) => user.id === selectedOwnerId);
  const focusedMobileChat = tab === "chats" && mobileChatOpen;
  const tabs: Array<{ id: Tab; label: string; icon: typeof MessageCircle }> = [
    { id: "chats", label: "Conversas", icon: MessageCircle },
    { id: "backups", label: "Backups", icon: Archive },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return <div className={cn("jd-mobile-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950", focusedMobileChat && "jd-chat-focused")}>
    <header className={cn(
      "jd-app-header min-h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-900 sm:px-4",
      focusedMobileChat ? "hidden md:flex" : "flex",
    )}>
      <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
        <Image src="/jd-logo.png" alt="JD" fill sizes="40px" className="object-cover"/>
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm">JD Consultoria</strong>
        <p className={cn("mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold", online ? "text-emerald-600" : "text-amber-600")}>
          {online ? <Wifi size={11} className="shrink-0"/> : <WifiOff size={11} className="shrink-0"/>}
          <span className="truncate">{online ? activeOwner ? `${activeOwner.name} · sincronização ativa` : "Conectado ao CRM" : "Sem conexão"}</span>
        </p>
      </div>
      {isAdmin && <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 sm:inline-flex"><ShieldCheck size={12}/>Administrador</span>}
      {!androidApp && <Link href="/dashboard" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700" aria-label="Abrir CRM completo">
        <LayoutDashboard size={18}/>
      </Link>}
    </header>

    {isAdmin && !focusedMobileChat && <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
      <label htmlFor="app-jd-owner" className="sr-only">CRM do corretor</label>
      <select id="app-jd-owner" value={selectedOwnerId} onChange={(event) => { setSelectedOwnerId(event.target.value); setMobileChatOpen(false); }} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
        <option value="">Selecione o CRM do corretor</option>
        {crmData?.users.filter((user) => user.active && user.crmEnabled).map((user) => <option key={user.id} value={user.id}>{user.name}{user.whatsappConnected ? " · WhatsApp conectado" : " · sem WhatsApp"}</option>)}
      </select>
    </div>}

    <main className="min-h-0 flex-1 overflow-hidden">
      {needsOwner ? <div className="grid h-full place-items-center p-6 text-center"><div className="max-w-sm"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><ShieldCheck size={28}/></span><h1 className="mt-4 text-xl font-bold">Selecione um CRM</h1><p className="mt-2 text-sm leading-6 text-slate-500">Cada corretor possui conversas e backups separados. Escolha uma conta no seletor acima.</p></div></div> : <>
        {tab === "chats" && <div className="flex h-full min-h-0 overflow-hidden">
          <ConversationList
            items={inbox.data}
            total={inbox.total}
            activeId={inbox.active?.id}
            onSelect={(id) => { inbox.setActiveId(id); setMobileChatOpen(true); }}
            onSync={inbox.syncWhatsApp}
            syncing={inbox.syncing}
            syncStatus={inbox.syncStatus}
            search={inbox.search}
            onSearch={inbox.setSearch}
            filter={inbox.filter}
            onFilter={inbox.setFilter}
            hasMore={inbox.hasMore}
            onLoadMore={() => void inbox.loadMore()}
            loadingMore={inbox.loadingMore}
            className={mobileChatOpen ? "hidden md:flex" : "flex"}
          />
          <ChatWindow
            conversation={inbox.active}
            ownerId={ownerId}
            onChanged={() => void inbox.mutate()}
            onBack={() => setMobileChatOpen(false)}
            className={mobileChatOpen ? "flex" : "hidden md:flex"}
          />
        </div>}
        {tab === "backups" && <BackupVault ownerId={ownerId}/>}
        {tab === "settings" && <div className="scrollbar h-full overflow-y-auto overscroll-contain px-4 py-5 pb-8 sm:px-6 sm:py-7">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">Aplicativo</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Ajustes do App JD</h1>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Smartphone className="text-blue-600"/><h2 className="mt-3 font-bold">{androidApp ? "Aplicativo Android" : "Instale na tela inicial"}</h2><p className="mb-4 mt-1 text-sm leading-6 text-slate-500">{androidApp ? "Você está usando o aplicativo oficial da JD Consultoria." : "Use o App JD em tela cheia, com ícone próprio no seu dispositivo."}</p>{androidApp ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><strong>App instalado</strong><p className="mt-1 text-xs opacity-75">Versão Android conectada com segurança ao CRM.</p></div> : <PwaInstallButton/>}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><strong className="text-sm">Conta conectada</strong><p className="mt-1 break-words text-xs text-slate-500">{session?.user?.name} · {session?.user?.email}</p><button type="button" onClick={() => void signOut({ callbackUrl: "/login" })} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"><LogOut size={16}/>Sair do aplicativo</button></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900 md:col-span-2"><strong className="block text-sm text-slate-800 dark:text-slate-100">Privacidade</strong><p className="mt-2">O service worker não armazena conversas nem respostas das APIs. Apenas recursos estáticos da interface são mantidos para acelerar a abertura do aplicativo.</p></div>
            </div>
          </div>
        </div>}
      </>}
    </main>

    <nav aria-label="Navegação principal do App JD" className={cn(
      "z-40 min-h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0 items-start justify-around border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95",
      focusedMobileChat ? "hidden md:flex" : "flex",
    )}>
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setTab(id); setMobileChatOpen(false); }} aria-current={tab === id ? "page" : undefined} className={cn("flex min-h-14 min-w-20 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-[10px] font-bold transition", tab === id ? "text-blue-700 dark:text-blue-300" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}><span className={cn("grid h-8 w-12 place-items-center rounded-full", tab === id && "bg-blue-50 dark:bg-blue-950/40")}><Icon size={19}/></span>{label}</button>)}
    </nav>
  </div>;
}
