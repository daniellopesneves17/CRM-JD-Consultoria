// Gera quando necessário e envia a proposta pelo WhatsApp.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { generateProposalPdf } from "@/services/pdf";
import { sendDocument } from "@/services/uazapi";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireUser(); if ("response" in access) return access.response;
  try { const { id } = await params; const proposal = await prisma.proposal.findFirst({ where: { id, ...(access.session.user.role === "ADMIN" ? {} : { lead: { userId: access.session.user.id } }) }, include: { lead: true } }); if (!proposal) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 }); let pdfUrl = proposal.pdfUrl; if (!pdfUrl) { const generated = await generateProposalPdf({ id, operator: proposal.operator, plan: proposal.plan, coverage: proposal.coverage, monthlyValue: Number(proposal.monthlyValue), lead: proposal.lead }); pdfUrl = generated.url; } await sendDocument(proposal.lead.phone, pdfUrl, `proposta-${id}.pdf`, `Olá, ${proposal.lead.name}. Segue sua proposta.`); const updated = await prisma.proposal.update({ where: { id }, data: { pdfUrl, status: "ENVIADA", sentAt: new Date() } }); await prisma.lead.update({ where: { id: proposal.leadId }, data: { stage: "PROPOSTA_ENVIADA", lastActivityAt: new Date() } }); return NextResponse.json(updated); } catch (error) { return apiError(error, "Não foi possível enviar a proposta."); }
}
