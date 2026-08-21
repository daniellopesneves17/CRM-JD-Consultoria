import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { createPublicAssetUpload, getPublicAssetUrl, publicAssetExists, publicAssetExtension, validatePublicAsset } from "@/services/supabase-storage";

type Context = { params: Promise<{ id: string }> };

async function managedUser(id: string, ownId: string) {
  if (id === ownId) return { response: NextResponse.json({ error: "Você não pode modificar a própria conta por esta área." }, { status: 400 }) } as const;
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { response: NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 }) } as const;
  return { id } as const;
}

export async function POST(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const target = await managedUser(id, access.session.user.id);
    if ("response" in target) return target.response;
    const body = await request.json() as { contentType?: unknown; size?: unknown };
    try { validatePublicAsset(body.contentType, body.size); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    const path = `users/${id}/avatar-${Date.now()}.${publicAssetExtension(body.contentType as string)}`;
    return NextResponse.json(await createPublicAssetUpload(path));
  } catch (error) {
    return apiError(error, "Não foi possível autorizar o envio da foto do corretor.");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const target = await managedUser(id, access.session.user.id);
    if ("response" in target) return target.response;
    const { path } = await request.json() as { path?: unknown };
    const prefix = `users/${id}/avatar-`;
    if (typeof path !== "string" || !path.startsWith(prefix) || !/\.(png|jpg|webp)$/.test(path)) return NextResponse.json({ error: "Upload inválido." }, { status: 400 });
    if (!(await publicAssetExists(path))) return NextResponse.json({ error: "A imagem enviada não foi encontrada." }, { status: 400 });
    const url = getPublicAssetUrl(path);
    await prisma.user.update({ where: { id }, data: { avatarUrl: url } });
    return NextResponse.json({ url });
  } catch (error) {
    return apiError(error, "Não foi possível atualizar a foto do corretor.");
  }
}
