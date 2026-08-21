import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";
import { createPublicAssetUpload, getPublicAssetUrl, publicAssetExists, publicAssetExtension, validatePublicAsset } from "@/services/supabase-storage";

export async function POST(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const body = await request.json() as { contentType?: unknown; size?: unknown };
    try { validatePublicAsset(body.contentType, body.size); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    const extension = publicAssetExtension(body.contentType as string);
    const path = `users/${access.session.user.id}/avatar-${Date.now()}.${extension}`;
    return NextResponse.json(await createPublicAssetUpload(path));
  } catch (error) {
    return apiError(error, "Não foi possível autorizar o envio da foto.");
  }
}

export async function PATCH(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const { path } = await request.json() as { path?: unknown };
    const prefix = `users/${access.session.user.id}/avatar-`;
    if (typeof path !== "string" || !path.startsWith(prefix) || !/\.(png|jpg|webp)$/.test(path)) return NextResponse.json({ error: "Upload inválido." }, { status: 400 });
    if (!(await publicAssetExists(path))) return NextResponse.json({ error: "A imagem enviada não foi encontrada." }, { status: 400 });
    const url = getPublicAssetUrl(path);
    await prisma.user.update({ where: { id: access.session.user.id }, data: { avatarUrl: url } });
    return NextResponse.json({ url });
  } catch (error) {
    return apiError(error, "Não foi possível atualizar sua foto.");
  }
}
