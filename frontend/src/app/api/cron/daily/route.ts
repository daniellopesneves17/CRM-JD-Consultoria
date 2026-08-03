import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { GET as runFollowUp } from "../follow-up/route";
import { GET as runReactivation } from "../reactivation/route";
import { GET as runScoreUpdate } from "../score-update/route";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const jobs = await Promise.allSettled([
    runFollowUp(request),
    runReactivation(request),
    runScoreUpdate(request),
  ]);

  const results = await Promise.all(
    jobs.map(async (job, index) => ({
      job: ["follow-up", "reactivation", "score-update"][index],
      ok: job.status === "fulfilled" && job.value.ok,
      status: job.status === "fulfilled" ? job.value.status : 500,
      data:
        job.status === "fulfilled"
          ? await job.value.json().catch(() => null)
          : { error: job.reason instanceof Error ? job.reason.message : "Falha inesperada" },
    })),
  );

  const ok = results.every((result) => result.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500 });
}
