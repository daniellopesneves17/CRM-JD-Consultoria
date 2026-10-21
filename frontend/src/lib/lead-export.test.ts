import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  createLeadExportWorkbook,
  leadExportAuditDetail,
  leadExportFileName,
  LeadExportRequestError,
  resolveLeadExportRequest,
  sortLeadExportRows,
  type LeadExportRow,
} from "./lead-export";

const broker = { id: "broker-1", name: "Ana Corretora", role: "CORRETOR" as const };
const admin = { id: "admin-1", name: "Daniel Admin", role: "ADMIN" as const };

function params(values: Record<string, string> = {}) {
  return new URLSearchParams({ format: "xlsx", ...values });
}

async function readWorkbook(rows: LeadExportRow[], includeResponsible = false) {
  const buffer = await createLeadExportWorkbook(rows, includeResponsible);
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.getWorksheet("Contatos");
  assert.ok(worksheet);
  return { buffer, worksheet };
}

test("1. corretor exporta somente a própria carteira", () => {
  assert.deepEqual(resolveLeadExportRequest(broker, params({ scope: "mine" })), {
    scope: "mine",
    responsibleId: "broker-1",
  });
});

test("2. corretor não pode exportar a carteira de outro usuário", () => {
  assert.throws(
    () => resolveLeadExportRequest(broker, params({ scope: "mine", responsavel_id: "broker-2" })),
    (error) => error instanceof LeadExportRequestError && error.status === 403,
  );
});

test("3. administrador pode selecionar qualquer corretor", () => {
  assert.deepEqual(resolveLeadExportRequest(admin, params({ responsavel_id: "broker-2" })), {
    scope: "responsible",
    responsibleId: "broker-2",
  });
});

test("4. administrador pode exportar todas as carteiras", () => {
  assert.deepEqual(resolveLeadExportRequest(admin, params({ scope: "all" })), { scope: "all" });
});

test("5. exportação suporta mais de 100 contatos", async () => {
  const rows = Array.from({ length: 150 }, (_, index) => ({
    id: "lead-" + index,
    name: "Contato " + String(index).padStart(3, "0"),
    phone: "055" + String(index).padStart(8, "0"),
  }));
  const { worksheet } = await readWorkbook(rows);
  assert.equal(worksheet.rowCount, 151);
});

test("6. a geração não cria contatos duplicados", async () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({
    id: "unique-" + index,
    name: "Pessoa " + index,
    phone: String(index),
  }));
  const { worksheet } = await readWorkbook(rows);
  const names = worksheet.getColumn(1).values.slice(2);
  assert.equal(names.length, rows.length);
  assert.equal(new Set(names).size, rows.length);
});

test("7. nenhum registro é omitido e a ordenação é alfabética", async () => {
  const sorted = sortLeadExportRows([
    { id: "3", name: "Zilda", phone: "3" },
    { id: "1", name: "Álvaro", phone: "1" },
    { id: "2", name: "Bruna", phone: "2" },
  ]);
  const { worksheet } = await readWorkbook(sorted);
  assert.deepEqual(worksheet.getColumn(1).values.slice(2), ["Álvaro", "Bruna", "Zilda"]);
});

test("8. contatos sem telefone permanecem com célula vazia", async () => {
  const { worksheet } = await readWorkbook([{ id: "1", name: "Sem telefone", phone: "" }]);
  assert.equal(worksheet.getCell("B2").text, "");
  assert.equal(worksheet.rowCount, 2);
});

test("9. telefone é preservado como texto, incluindo zero inicial", async () => {
  const { worksheet } = await readWorkbook([{ id: "1", name: "Contato", phone: "0011 (22) 99999-0000" }]);
  assert.equal(worksheet.getCell("B2").value, "0011 (22) 99999-0000");
  assert.equal(worksheet.getCell("B2").numFmt, "@");
  assert.equal(worksheet.getCell("B2").type, ExcelJS.ValueType.String);
});

test("10. leads diferentes com o mesmo número ocupam linhas próprias", async () => {
  const { worksheet } = await readWorkbook([
    { id: "1", name: "Contato A", phone: "5522999999999" },
    { id: "2", name: "Contato B", phone: "5522999999999" },
  ]);
  assert.equal(worksheet.rowCount, 3);
  assert.equal(worksheet.getCell("B2").text, worksheet.getCell("B3").text);
});

test("11. arquivo xlsx é válido e contém formatação operacional", async () => {
  const { buffer, worksheet } = await readWorkbook([
    { id: "1", name: "Contato", phone: "123", responsibleName: "Ana" },
  ], true);
  assert.ok(buffer.subarray(0, 2).equals(Buffer.from("PK")));
  assert.equal(worksheet.name, "Contatos");
  assert.equal(worksheet.getRow(1).font.bold, true);
  assert.equal(worksheet.views[0]?.state, "frozen");
  assert.equal(worksheet.views[0]?.ySplit, 1);
  assert.equal(worksheet.views[0]?.topLeftCell, "A2");
  assert.ok(worksheet.autoFilter);
  assert.equal(worksheet.columnCount, 3);
  assert.ok((worksheet.getColumn(1).width ?? 0) >= 30);
});

test("12. usuário não autenticado é bloqueado", () => {
  assert.throws(
    () => resolveLeadExportRequest(null, params()),
    (error) => error instanceof LeadExportRequestError && error.status === 401,
  );
});

test("13. alteração indevida de responsável enviada pelo frontend é bloqueada", () => {
  assert.throws(
    () => resolveLeadExportRequest(broker, params({ scope: "all", responsavel_id: "admin-1" })),
    (error) => error instanceof LeadExportRequestError && [400, 403].includes(error.status),
  );
});

test("14. auditoria registra apenas metadados necessários", () => {
  const detail = JSON.parse(leadExportAuditDetail({
    scope: "responsible",
    responsibleId: "broker-1",
    responsibleName: "Ana Corretora",
    count: 130,
    emptyPhoneCount: 4,
    fileName: leadExportFileName("responsible", "Ana Corretora", new Date("2026-10-21T15:00:00Z")),
  }));
  assert.deepEqual(Object.keys(detail).sort(), [
    "count", "emptyPhoneCount", "fileName", "format", "responsibleId", "responsibleName", "scope",
  ]);
  assert.equal(detail.count, 130);
  assert.equal(detail.format, "xlsx");
  assert.equal(JSON.stringify(detail).includes("phone"), false);
});
