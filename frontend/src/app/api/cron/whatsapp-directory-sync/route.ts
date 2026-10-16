import { NextResponse } from "next/server";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { syncUazapiDirectory } from "@/lib/uazapi-history-sync";
import { resolveUazapiConfig } from "@/services/uazapi";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("whatsapp-directory-sync", 5 * 60 * 60_000);
  if (!cron) return NextResponse.json({ ok: true, skipped: true, reason: "Diretório sincronizado recentemente ou em andamento." }, { status: 202 });

  try {
    const users = await prisma.user.findMany({
      where: { active: true, crmEnabled: true },
      select: { id: true, name: true, email: true, active: true, crmEnabled: true, uazapiBaseUrl: true, uazapiToken: true },
      orderBy: { createdAt: "asc" },
    });
    const owners = users.filter((user) => Boolean(resolveUazapiConfig(user)));
    const results = [];
    let processed = 0;
    let errors = 0;

    for (const owner of owners) {
      try {
        const result = await syncUazapiDirectory(owner, { pageSize: 1000, maxPages: 50 });
        processed += result.contacts;
        results.push({ ok: true, ...result });
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : "Falha na sincronização do diretório do WhatsApp.";
        results.push({ ownerId: owner.id, ok: false, error: message });
        await prisma.errorLog.create({ data: { source: "whatsapp-directory-sync", message, context: { ownerId: owner.id } } }).catch(() => undefined);
      }
    }

    await finishCron(cron.id, processed, errors, JSON.stringify({ owners: owners.length, results }));
    if (errors) {
      await notifyAdmins({
        type: "SYSTEM_FAILURE",
        title: "Sincronização de contatos com falhas",
        body: `${errors} CRM(s) não puderam atualizar todos os contatos do WhatsApp.`,
        href: "/admin/logs",
        sourceKey: `whatsapp-directory-sync:${cron.id}`,
      }).catch(() => undefined);
    }
    return NextResponse.json({ ok: errors === 0, processed, errors, results });
  } catch (error) {
    await failCron(cron.id, "whatsapp-directory-sync", error);
    return NextResponse.json({ error: "Falha na sincronização automática dos contatos do WhatsApp." }, { status: 500 });
  }
}

export const POST = GET;
