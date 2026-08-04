// Executa ações assistidas por IA para renovação, reativação e aniversário.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/route";
import { respond } from "@/services/ai/client";
import { sendText } from "@/services/uazapi";

const bodySchema = z.object({ type: z.enum(["renewal", "reactivation", "birthday"]), send: z.boolean().default(true) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
    if (!body.send) {
      const task = await prisma.task.create({ data: { leadId: id, title: "Acompanhar renovação", description: "Contato criado pelo painel de saúde da carteira.", dueAt: new Date(Date.now() + 86_400_000), type: "FOLLOWUP" } });
      return NextResponse.json({ task, sent: false });
    }
    const instructions = body.type === "birthday"
      ? "Escreva uma mensagem curta, calorosa, humana e não comercial de feliz aniversário em português do Brasil. Não use markdown."
      : body.type === "renewal"
        ? "Escreva uma mensagem breve e consultiva em português do Brasil para iniciar a renovação do plano de saúde, sem pressão comercial. Não use markdown."
        : "Escreva uma mensagem breve e humana em português do Brasil para retomar o relacionamento com um cliente de plano de saúde, sem pressão. Não use markdown.";
    const message = await respond({ model: process.env.OPENAI_FAST_MODEL ?? "gpt-4o", instructions, input: JSON.stringify({ name: lead.name, operator: lead.currentOperator, notes: lead.notes }), promptType: body.type, leadId: lead.id });
    await sendText(lead.phone, message);
    await prisma.activity.create({ data: { leadId: lead.id, type: `${body.type}_message_sent`, detail: message } });
    return NextResponse.json({ sent: true, message });
  } catch (error) {
    return apiError(error, "Não foi possível concluir a ação da carteira.");
  }
}
