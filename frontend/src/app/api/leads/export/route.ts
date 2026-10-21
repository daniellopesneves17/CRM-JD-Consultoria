import { NextResponse } from "next/server";
import { requestOrigin } from "@/lib/admin-users";
import {
  createLeadExportWorkbook,
  leadExportAuditDetail,
  leadExportFields,
  leadExportFileName,
  LeadExportRequestError,
  resolveLeadExportRequest,
  sortLeadExportRows,
} from "@/lib/lead-export";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;

  try {
    const url = new URL(request.url);
    const selection = resolveLeadExportRequest(
      {
        id: access.session.user.id,
        name: access.session.user.name,
        role: access.session.user.role,
      },
      url.searchParams,
    );
    const preview = ["1", "true"].includes(url.searchParams.get("preview") ?? "");

    let responsibleName = access.session.user.name || "Minha carteira";
    if (selection.scope === "responsible") {
      const responsible = await prisma.user.findFirst({
        where: { id: selection.responsibleId, role: "CORRETOR" },
        select: { id: true, name: true },
      });
      if (!responsible) {
        return NextResponse.json({ error: "Corretor responsável não encontrado." }, { status: 404 });
      }
      responsibleName = responsible.name;
    } else if (selection.scope === "all") {
      responsibleName = "Todas as carteiras";
    }

    const where = selection.scope === "all"
      ? { userId: { not: null } }
      : { userId: selection.responsibleId };

    const [count, emptyPhoneCount, ownerGroups] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, phone: "" } }),
      selection.scope === "all"
        ? prisma.lead.groupBy({ by: ["userId"], where, _count: { _all: true } })
        : Promise.resolve([]),
    ]);
    const includeResponsible = selection.scope === "all" && ownerGroups.length > 1;
    const fileName = leadExportFileName(selection.scope, responsibleName);

    if (preview) {
      return NextResponse.json({
        responsibleName,
        count,
        emptyPhoneCount,
        fields: leadExportFields(includeResponsible),
        format: "Excel (.xlsx)",
        fileName,
        includeResponsible,
      });
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Nenhum contato foi encontrado. Nenhuma linha foi exportada." },
        { status: 422 },
      );
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const actualEmptyPhoneCount = leads.filter((lead) => !lead.phone.trim()).length;
    const rows = sortLeadExportRows(leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      responsibleName: lead.assignedTo?.name,
    })));
    const workbook = await createLeadExportWorkbook(rows, includeResponsible);

    const origin = requestOrigin(request);
    await prisma.accessLog.create({
      data: {
        userId: access.session.user.id,
        action: "leads_export",
        ip: origin.ip,
        userAgent: origin.userAgent,
        detail: leadExportAuditDetail({
          scope: selection.scope,
          responsibleId: selection.responsibleId,
          responsibleName,
          count: leads.length,
          emptyPhoneCount: actualEmptyPhoneCount,
          fileName,
        }),
      },
    });

    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="' + fileName + '"',
        "Cache-Control": "private, no-store",
        "X-Export-Count": String(leads.length),
        "X-Export-Without-Phone": String(actualEmptyPhoneCount),
        "X-Export-Filename": fileName,
      },
    });
  } catch (error) {
    if (error instanceof LeadExportRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return apiError(error, "Não foi possível exportar a carteira de contatos.");
  }
}
