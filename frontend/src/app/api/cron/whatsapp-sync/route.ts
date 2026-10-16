import { NextResponse } from "next/server";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { syncUazapiHistory } from "@/lib/uazapi-history-sync";
import { resolveUazapiConfig } from "@/services/uazapi";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("whatsapp-sync", 4 * 60_000);
  if (!cron) return NextResponse.json({ ok: true, skipped: true, reason: "Sincronização recente ou em andamento." }, { status: 202 });

  try {
    const users = await prisma.user.findMany({
      where: { active: true, crmEnabled: true },
      select: { id: true, name: true, email: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true },
      orderBy: { createdAt: "asc" },
    });
    const owners = users.filter((user) => Boolean(resolveUazapiConfig(user)));
    const results = [];
    let imported = 0;
    let errors = 0;

    for (const owner of owners) {
      try {
        const latest = await prisma.message.aggregate({
          where: { conversation: { lead: { userId: owner.id } } },
          _max: { sentAt: true },
        });
        const since = latest._max.sentAt
          ? new Date(latest._max.sentAt.getTime() - 15 * 60_000)
          : new Date(Date.now() - 24 * 60 * 60_000);
        const result = await syncUazapiHistory(owner, { includeDirectory: false, maxPages: 3, pageSize: 1000, since });
        imported += result.imported;
        results.push({ ok: true, ...result });
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : "Falha na sincronização do WhatsApp.";
        results.push({ ownerId: owner.id, ok: false, error: message });
        await prisma.errorLog.create({ data: { source: "whatsapp-sync", message, context: { ownerId: owner.id } } }).catch(() => undefined);
      }
    }

    await finishCron(cron.id, imported, errors, JSON.stringify({ owners: owners.length, results }));
    if (errors) {
      await notifyAdmins({
        type: "SYSTEM_FAILURE",
        title: "Sincronização do WhatsApp com falhas",
        body: `${errors} CRM(s) não puderam ser reconciliados automaticamente.`,
        href: "/admin/logs",
        sourceKey: `whatsapp-sync:${cron.id}`,
      }).catch(() => undefined);
    }
    return NextResponse.json({ ok: errors === 0, imported, errors, results });
  } catch (error) {
    await failCron(cron.id, "whatsapp-sync", error);
    return NextResponse.json({ error: "Falha na sincronização automática do WhatsApp." }, { status: 500 });
  }
}

export const POST = GET;
