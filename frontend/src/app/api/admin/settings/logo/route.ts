// Upload seguro do logotipo no bucket público assets do Supabase Storage.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { uploadPublicAsset } from "@/services/supabase-storage";

const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !allowed.has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Envie uma imagem PNG, JPG, WebP ou SVG de até 5 MB." }, { status: 400 });
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "png";
    const url = await uploadPublicAsset(`company/logo.${extension}`, new Uint8Array(await file.arrayBuffer()), file.type);
    await prisma.companySettings.upsert({ where: { id: "default" }, update: { logoUrl: url }, create: { id: "default", logoUrl: url } });
    return NextResponse.json({ url });
  } catch (error) {
    return apiError(error, "Não foi possível enviar o logotipo.");
  }
}
