import ExcelJS from "exceljs";

export type LeadExportActor = {
  id: string;
  name?: string | null;
  role: "ADMIN" | "CORRETOR";
};

export type LeadExportScope = "mine" | "responsible" | "all";

export type LeadExportSelection = {
  scope: LeadExportScope;
  responsibleId?: string;
};

export type LeadExportRow = {
  id: string;
  name: string;
  phone: string | null;
  responsibleName?: string | null;
};

export class LeadExportRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "LeadExportRequestError";
  }
}

export function resolveLeadExportRequest(
  actor: LeadExportActor | null,
  searchParams: URLSearchParams,
): LeadExportSelection {
  if (!actor) throw new LeadExportRequestError("Não autorizado.", 401);

  const format = searchParams.get("format") ?? "xlsx";
  const scope = searchParams.get("scope") ?? "mine";
  const responsibleId = searchParams.get("responsavel_id")?.trim();

  if (format !== "xlsx") throw new LeadExportRequestError("Formato de exportação inválido.", 400);
  if (scope !== "mine" && scope !== "all") throw new LeadExportRequestError("Escopo de exportação inválido.", 400);
  if (scope === "all" && responsibleId) {
    throw new LeadExportRequestError("Não combine todas as carteiras com um responsável específico.", 400);
  }

  if (actor.role !== "ADMIN") {
    if (scope !== "mine" || responsibleId) {
      throw new LeadExportRequestError("Você só pode exportar a própria carteira.", 403);
    }
    return { scope: "mine", responsibleId: actor.id };
  }

  if (scope === "all") return { scope: "all" };
  if (responsibleId) return { scope: "responsible", responsibleId };
  return { scope: "mine", responsibleId: actor.id };
}

export function brazilDateStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function fileSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "responsavel";
}

export function leadExportFileName(
  scope: LeadExportScope,
  responsibleName: string,
  date = new Date(),
) {
  const stamp = brazilDateStamp(date);
  return scope === "all"
    ? "todas_as_carteiras_" + stamp + ".xlsx"
    : "carteira_" + fileSlug(responsibleName) + "_" + stamp + ".xlsx";
}

export function leadExportFields(includeResponsible: boolean) {
  return includeResponsible
    ? ["Nome", "Número/WhatsApp", "Corretor responsável"]
    : ["Nome", "Número/WhatsApp"];
}

export function sortLeadExportRows(rows: LeadExportRow[]) {
  return [...rows].sort((left, right) => {
    const byName = left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
    return byName || left.id.localeCompare(right.id);
  });
}

export async function createLeadExportWorkbook(
  rows: LeadExportRow[],
  includeResponsible: boolean,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CRM JD Consultoria";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Contatos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "Nome", key: "name", width: 38 },
    { header: "Número/WhatsApp", key: "phone", width: 24, style: { numFmt: "@" } },
    ...(includeResponsible
      ? [{ header: "Corretor responsável", key: "responsibleName", width: 32 }]
      : []),
  ];

  for (const row of rows) {
    worksheet.addRow({
      name: row.name,
      phone: row.phone ?? "",
      ...(includeResponsible ? { responsibleName: row.responsibleName ?? "Sem responsável" } : {}),
    });
  }

  const header = worksheet.getRow(1);
  header.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B73" } };
  header.alignment = { vertical: "middle" };
  header.height = 24;
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: includeResponsible ? 3 : 2 },
  };
  worksheet.getColumn(2).numFmt = "@";
  worksheet.eachRow((row, rowNumber) => {
    row.font = rowNumber === 1 ? header.font : { name: "Arial", size: 10 };
    row.alignment = { vertical: "middle" };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function leadExportAuditDetail(input: {
  scope: LeadExportScope;
  responsibleId?: string;
  responsibleName: string;
  count: number;
  emptyPhoneCount: number;
  fileName: string;
}) {
  return JSON.stringify({
    scope: input.scope,
    responsibleId: input.responsibleId ?? null,
    responsibleName: input.responsibleName,
    count: input.count,
    emptyPhoneCount: input.emptyPhoneCount,
    fileName: input.fileName,
    format: "xlsx",
  });
}
