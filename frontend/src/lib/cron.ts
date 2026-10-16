// Autorização, exclusão mútua e auditoria dos jobs executados sem navegador.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authorizeCron(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const vercelSecret = process.env.CRON_SECRET ?? "";
  if (token && vercelSecret && safeEqual(token, vercelSecret)) return null;

  const expectedHash = process.env.SUPABASE_CRON_SECRET_HASH?.trim().toLowerCase() ?? "";
  const receivedHash = token ? createHash("sha256").update(token).digest("hex") : "";
  if (receivedHash && expectedHash && safeEqual(receivedHash, expectedHash)) return null;
  return new NextResponse("Unauthorized", { status: 401 });
}

export async function startCron(jobName: string, minimumIntervalMs = 0) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${jobName}))`;
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 15 * 60_000);
    await tx.cronLog.updateMany({
      where: { jobName, status: "running", startedAt: { lt: staleBefore } },
      data: { status: "failed", errors: 1, finishedAt: now, detail: "Execução interrompida ou expirada." },
    });
    if (minimumIntervalMs > 0) {
      const recent = await tx.cronLog.findFirst({
        where: {
          jobName,
          startedAt: { gte: new Date(now.getTime() - minimumIntervalMs) },
          status: { in: ["running", "completed", "completed_with_errors"] },
        },
        select: { id: true },
      });
      if (recent) return null;
    }
    return tx.cronLog.create({ data: { jobName, startedAt: now, status: "running" } });
  }, { timeout: 10_000 });
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
  await notifyAdmins({
    type: "SYSTEM_FAILURE",
    title: `Falha na automação ${jobName}`,
    body: message.slice(0, 180),
    href: "/admin/logs",
    sourceKey: `cron:${jobName}:${id}`,
  }).catch(() => undefined);
}

