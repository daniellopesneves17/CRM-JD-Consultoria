// Geração do PDF serverless e upload ao Supabase Storage.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalDocument, type ProposalPdfData } from "@/components/proposals/ProposalDocument";
import { uploadFile } from "./supabase-storage";

export async function generateProposalPdf(proposal: ProposalPdfData) {
  const document = React.createElement(ProposalDocument, { proposal }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(document);
  const path = `${proposal.id}/proposta-${proposal.id}.pdf`;
  const url = await uploadFile("proposals", path, new Uint8Array(buffer), "application/pdf");
  return { buffer, url };
}
