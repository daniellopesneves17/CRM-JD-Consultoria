// Orquestra os cron jobs diários e registra o resultado consolidado.
import { NextResponse } from "next/server";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { GET as runFollowUp } from "../follow-up/route";
import { GET as runReactivation } from "../reactivation/route";
import { GET as runScoreUpdate } from "../score-update/route";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("daily");
  try {
    const jobs = await Promise.allSettled([runFollowUp(request), runReactivation(request), runScoreUpdate(request)]);
    const results = await Promise.all(jobs.map(async (job, index) => ({
      job: ["follow-up", "reactivation", "score-update"][index],
      ok: job.status === "fulfilled" && job.value.ok,
      status: job.status === "fulfilled" ? job.value.status : 500,
      data: job.status === "fulfilled" ? await job.value.json().catch(() => null) : { error: job.reason instanceof Error ? job.reason.message : "Falha inesperada" }
    })));
    const errors = results.filter((result) => !result.ok).length;
    await finishCron(cron.id, results.length, errors, JSON.stringify(results));
    return NextResponse.json({ ok: errors === 0, results }, { status: errors === 0 ? 200 : 500 });
  } catch (error) {
    await failCron(cron.id, "daily", error);
    return NextResponse.json({ error: "Falha na rotina diária." }, { status: 500 });
  }
}
