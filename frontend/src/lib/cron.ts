// Autorização comum dos cron jobs da Vercel.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return null;
}

export function startCron(jobName: string) {
  return prisma.cronLog.create({ data: { jobName, startedAt: new Date(), status: "running" } });
}

export function finishCron(id: string, processed: number, errors = 0, detail?: string) {
  return prisma.cronLog.update({ where: { id }, data: { finishedAt: new Date(), processed, errors, status: errors ? "completed_with_errors" : "completed", detail } });
}

export async function failCron(id: string, jobName: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Falha inesperada";
  const stack = error instanceof Error ? error.stack : undefined;
  await prisma.$transaction([
    prisma.cronLog.update({ where: { id }, data: { finishedAt: new Date(), errors: 1, status: "failed", detail: message } }),
    prisma.errorLog.create({ data: { source: "cron", message, stack, context: { jobName } } })
  ]);
}

