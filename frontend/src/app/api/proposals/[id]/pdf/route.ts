// Gera, salva e entrega o PDF da proposta.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { generateProposalPdf } from "@/services/pdf";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try { const { id } = await params; const proposal = await prisma.proposal.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) }, include: { lead: { select: { name: true, cpf: true, livesCount: true } } } }); if (!proposal) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 }); const result = await generateProposalPdf({ id: proposal.id, operator: proposal.operator, plan: proposal.plan, coverage: proposal.coverage, monthlyValue: Number(proposal.monthlyValue), lead: proposal.lead }); await prisma.proposal.update({ where: { id }, data: { pdfUrl: result.url } }); return new NextResponse(new Uint8Array(result.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="proposta-${id}.pdf"`, "X-Proposal-Url": result.url } }); } catch (error) { return apiError(error, "Não foi possível gerar o PDF."); }
}

