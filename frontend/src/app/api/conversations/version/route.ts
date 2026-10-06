import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/route";

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() || null;
  if (access.session.user.role === "ADMIN" && !ownerId) return NextResponse.json({ version: "empty" });
  const userId = access.session.user.role === "ADMIN" ? ownerId! : access.session.user.id;
  const where = { conversation: { lead: { userId } } };
  const [count, latest] = await prisma.$transaction([
    prisma.message.count({ where }),
    prisma.message.aggregate({ where, _max: { sentAt: true } }),
  ]);
  return NextResponse.json(
    { version: `${count}:${latest._max.sentAt?.getTime() ?? 0}` },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
