import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { createPublicAssetUpload, getPublicAssetUrl, publicAssetExists, publicAssetExtension, validatePublicAsset } from "@/services/supabase-storage";

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const body = await request.json() as { contentType?: unknown; size?: unknown };
    try { validatePublicAsset(body.contentType, body.size); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    const path = `company/logo-${Date.now()}.${publicAssetExtension(body.contentType as string)}`;
    return NextResponse.json(await createPublicAssetUpload(path));
  } catch (error) {
    return apiError(error, "Não foi possível autorizar o envio do logotipo.");
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { path } = await request.json() as { path?: unknown };
    if (typeof path !== "string" || !path.startsWith("company/logo-") || !/\.(png|jpg|webp)$/.test(path)) return NextResponse.json({ error: "Upload inválido." }, { status: 400 });
    if (!(await publicAssetExists(path))) return NextResponse.json({ error: "A imagem enviada não foi encontrada." }, { status: 400 });
    const url = getPublicAssetUrl(path);
    await prisma.companySettings.upsert({ where: { id: "default" }, update: { logoUrl: url }, create: { id: "default", logoUrl: url } });
    return NextResponse.json({ url });
  } catch (error) {
    return apiError(error, "Não foi possível atualizar o logotipo.");
  }
}
