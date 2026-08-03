// Respostas rápidas e humanizadas para o atendimento via WhatsApp.
import { FOLLOWUP_PROMPT, PREATTENDANCE_PROMPT, REACTIVATION_PROMPT, PERSONA_BASE } from "./prompts";
import { respond } from "./client";

const FAST_MODEL = process.env.OPENAI_FAST_MODEL ?? "gpt-4o";

export async function generateWhatsAppReply(params: {
  leadName: string;
  leadStage: string;
  livesCount: number;
  notes: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  triggerType: "new_message" | "follow_up" | "reactivation";
}) {
  const prompt = params.triggerType === "follow_up" ? FOLLOWUP_PROMPT : params.triggerType === "reactivation" ? REACTIVATION_PROMPT : PERSONA_BASE;
  return respond({ model: FAST_MODEL, instructions: prompt, input: JSON.stringify(params) });
}

export async function generatePreAttendance(params: { leadPhone: string; firstMessage: string }) {
  return respond({ model: FAST_MODEL, instructions: PREATTENDANCE_PROMPT, input: JSON.stringify(params) });
}

