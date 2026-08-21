import { NextResponse } from "next/server";
import { authorizeCron, failCron, finishCron, startCron } from "@/lib/cron";
import { refreshJdAiBriefing } from "@/services/ai/jd-ai";

export const maxDuration = 180;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const cron = await startCron("jd-ai-update");
  try {
    const briefing = await refreshJdAiBriefing();
    await finishCron(cron.id, 1, 0, briefing.researchDate);
    return NextResponse.json({ ok: true, researchDate: briefing.researchDate, sources: Array.isArray(briefing.sources) ? briefing.sources.length : 0 });
  } catch (error) {
    await failCron(cron.id, "jd-ai-update", error);
    return NextResponse.json({ error: "Falha ao atualizar o radar diário da JD AI." }, { status: 500 });
  }
}
