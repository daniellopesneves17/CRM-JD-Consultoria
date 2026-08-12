import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireUser } from "@/lib/route";

const querySchema = z.string().trim().min(2).max(80);

export async function GET(request: Request) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  try {
    const query = querySchema.parse(new URL(request.url).searchParams.get("q") ?? "");
    const digits = query.replace(/\D/g, "");
    const leadScope = access.session.user.role === "ADMIN" ? {} : { userId: access.session.user.id };
    const leadTerms = [
      { name: { contains: query, mode: "insensitive" as const } },
      { email: { contains: query, mode: "insensitive" as const } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];

    const [leads, proposals] = await Promise.all([
      prisma.lead.findMany({
        where: { ...leadScope, OR: leadTerms },
        select: { id: true, name: true, phone: true, stage: true, temperature: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.proposal.findMany({
        where: {
          lead: leadScope,
          OR: [
            { operator: { contains: query, mode: "insensitive" } },
            { plan: { contains: query, mode: "insensitive" } },
            { lead: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: { id: true, operator: true, plan: true, status: true, lead: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      items: [
        ...leads.map((lead) => ({
          id: lead.id,
          type: "lead" as const,
          title: lead.name,
          subtitle: `${lead.phone} · ${lead.stage.replaceAll("_", " ")}`,
          meta: lead.temperature,
          href: `/leads/${lead.id}`,
        })),
        ...proposals.map((proposal) => ({
          id: proposal.id,
          type: "proposal" as const,
          title: proposal.lead.name,
          subtitle: `${proposal.operator} · ${proposal.plan}`,
          meta: proposal.status,
          href: `/leads/${proposal.lead.id}`,
        })),
      ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ items: [] });
    return apiError(error, "Não foi possível realizar a busca.");
  }
}
