// Histórico das seis metas mensais mais recentes do usuário.
import { NextResponse } from "next/server";import { prisma } from "@/lib/prisma";import { requireUser } from "@/lib/route";
export async function GET(){const access=await requireUser();if("response"in access)return access.response;return NextResponse.json(await prisma.goal.findMany({where:{userId:access.session.user.id},orderBy:[{year:"desc"},{month:"desc"}],take:6}))}
