// Autoriza upload direto de comprovantes para um bucket privado do Supabase.
import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/route";
import { createProfitProofUpload, profitProofExtension, validateProfitProof } from "@/services/supabase-storage";

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;

  try {
    const body = await request.json() as { contentType?: unknown; size?: unknown };
    try {
      validateProfitProof(body.contentType, body.size);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    const extension = profitProofExtension(body.contentType as string);
    const path = `manual-profits/${access.session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    return NextResponse.json(await createProfitProofUpload(path));
  } catch (error) {
    return apiError(error, "Não foi possível autorizar o envio do comprovante.");
  }
}
