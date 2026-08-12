// Envia a foto do corretor ao bucket assets usando credenciais somente do servidor.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { uploadPublicAsset } from "@/services/supabase-storage";

type Context = { params: Promise<{ id: string }> };
const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    if (id === access.session.user.id) return NextResponse.json({ error: "Você não pode modificar a própria conta por esta área." }, { status: 400 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !allowed.has(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Envie uma imagem PNG, JPG ou WebP de até 5 MB." }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const url = await uploadPublicAsset(`users/${id}/avatar-${Date.now()}.${extension}`, new Uint8Array(await file.arrayBuffer()), file.type);
    await prisma.user.update({ where: { id }, data: { avatarUrl: url } });
    return NextResponse.json({ url });
  } catch (error) {
    return apiError(error, "Não foi possível atualizar a foto do corretor.");
  }
}
