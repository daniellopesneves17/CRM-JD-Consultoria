import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const users = await prisma.user.findMany({ where: { role: "CORRETOR" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, avatarUrl: true, active: true, crmEnabled: true } });
  return NextResponse.json({ users });
}
