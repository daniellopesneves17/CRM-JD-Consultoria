"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Download, FileSpreadsheet, X } from "lucide-react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";

type ExportMode = "mine" | "broker" | "all";

type Broker = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

type Preview = {
  responsibleName: string;
  count: number;
  emptyPhoneCount: number;
  fields: string[];
  format: string;
  fileName: string;
};

type CompletedExport = {
  count: number;
  emptyPhoneCount: number;
  fileName: string;
  url: string;
};

async function jsonFetcher(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Não foi possível preparar a exportação.");
  return payload;
}

export function LeadExportDialog({
  open,
  onOpenChange,
  initialMode,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initialMode: ExportMode;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [mode, setMode] = useState<ExportMode>(initialMode);
  const [brokerId, setBrokerId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<CompletedExport | null>(null);

  const { data: brokerPayload } = useSWR<{ users: Broker[] }>(
    open && isAdmin ? "/api/admin/users?role=CORRETOR" : null,
    jsonFetcher,
  );
  const brokers = useMemo(() => brokerPayload?.users ?? [], [brokerPayload]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setBrokerId("");
    setError("");
    setCompleted((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
  }, [initialMode, open]);

  useEffect(() => () => {
    if (completed) URL.revokeObjectURL(completed.url);
  }, [completed]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ format: "xlsx", preview: "1" });
    if (mode === "all") params.set("scope", "all");
    else {
      params.set("scope", "mine");
      if (mode === "broker" && brokerId) params.set("responsavel_id", brokerId);
    }
    return params.toString();
  }, [brokerId, mode]);
  const canPreview = open && (mode !== "broker" || Boolean(brokerId));
  const { data: preview, error: previewError, isLoading } = useSWR<Preview>(
    canPreview ? "/api/leads/export?" + query : null,
    jsonFetcher,
  );

  async function download() {
    if (!preview || preview.count === 0) return;
    setExporting(true);
    setError("");
    try {
      const exportQuery = query.replace("preview=1&", "").replace("&preview=1", "");
      const response = await fetch("/api/leads/export?" + exportQuery, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Não foi possível gerar o arquivo.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const result = {
        count: Number(response.headers.get("x-export-count") ?? preview.count),
        emptyPhoneCount: Number(response.headers.get("x-export-without-phone") ?? preview.emptyPhoneCount),
        fileName: response.headers.get("x-export-filename") ?? preview.fileName,
        url,
      };
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      setCompleted((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return result;
      });
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Não foi possível gerar o arquivo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-xl font-semibold">
                <FileSpreadsheet className="text-brand-500" size={22} />
                Exportar carteira de contatos
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Confira o escopo antes de gerar a planilha.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
              <X size={19} />
            </Dialog.Close>
          </div>

          {isAdmin && (
            <div className="mt-6 grid gap-2 sm:grid-cols-3" role="group" aria-label="Escopo da exportação">
              {(["mine", "broker", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setMode(value); setCompleted(null); setError(""); }}
                  className={"rounded-lg border px-3 py-2 text-sm font-medium transition " + (mode === value
                    ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800")}
                >
                  {value === "mine" ? "Minha carteira" : value === "broker" ? "Um corretor" : "Todas"}
                </button>
              ))}
            </div>
          )}

          {isAdmin && mode === "broker" && (
            <label className="mt-5 block text-sm font-medium">
              Corretor responsável
              <select
                value={brokerId}
                onChange={(event) => setBrokerId(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Selecione um corretor</option>
                {brokers.map((broker) => (
                  <option key={broker.id} value={broker.id}>
                    {broker.name}{broker.active ? "" : " (inativo)"}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/60">
            {!canPreview && <p className="text-sm text-slate-500">Selecione um corretor para consultar a carteira.</p>}
            {canPreview && isLoading && <p className="text-sm text-slate-500">Consultando contatos...</p>}
            {previewError && <p className="text-sm text-red-500">{previewError.message}</p>}
            {preview && (
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Responsável selecionado</dt><dd className="mt-1 font-semibold">{preview.responsibleName}</dd></div>
                <div><dt className="text-slate-500">Contatos encontrados</dt><dd className="mt-1 font-semibold">{preview.count}</dd></div>
                <div><dt className="text-slate-500">Campos exportados</dt><dd className="mt-1 font-semibold">{preview.fields.join(", ")}</dd></div>
                <div><dt className="text-slate-500">Formato</dt><dd className="mt-1 font-semibold">{preview.format}</dd></div>
              </dl>
            )}
          </div>

          {preview?.count === 0 && (
            <p className="mt-4 rounded-lg border border-amber-300/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              Nenhum contato encontrado. Nenhuma linha será exportada.
            </p>
          )}
          {error && <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
          {completed && (
            <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17} />Exportação concluída</p>
              <p className="mt-2">{completed.count} contatos exportados, sendo {completed.emptyPhoneCount} sem telefone.</p>
              <p className="mt-1 break-all">Arquivo: {completed.fileName}</p>
              <a className="mt-3 inline-flex items-center gap-2 font-semibold underline" href={completed.url} download={completed.fileName}>
                <Download size={16} />Baixar novamente
              </a>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Dialog.Close asChild><Button type="button" variant="secondary">Cancelar</Button></Dialog.Close>
            <Button type="button" onClick={() => void download()} disabled={!preview?.count || exporting || Boolean(previewError)}>
              <Download size={17} />{exporting ? "Gerando..." : "Gerar e baixar Excel"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
