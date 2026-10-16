// Respostas rápidas e humanizadas para o atendimento via WhatsApp.
import { requireRegisteredBrokerFirstName } from "@/lib/broker-identity";
import { FOLLOWUP_PROMPT, PREATTENDANCE_PROMPT, REACTIVATION_PROMPT, PERSONA_BASE } from "./prompts";
import { respond } from "./client";

const FAST_MODEL = process.env.OPENAI_FAST_MODEL ?? "gpt-4o";

export async function generateWhatsAppReply(params: {
  brokerFirstName: string;
  leadName: string;
  leadStage: string;
  livesCount: number;
  notes: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  triggerType: "new_message" | "follow_up" | "reactivation";
}) {
  const brokerFirstName = requireRegisteredBrokerFirstName(params.brokerFirstName);
  const prompt = params.triggerType === "follow_up" ? FOLLOWUP_PROMPT : params.triggerType === "reactivation" ? REACTIVATION_PROMPT : PERSONA_BASE;
  return respond({ model: FAST_MODEL, instructions: `${prompt}\nO nome autorizado para apresentação nesta conversa é: ${brokerFirstName}.`, input: JSON.stringify({ ...params, brokerFirstName }), promptType: params.triggerType === "new_message" ? "whatsapp_reply" : params.triggerType });
}

export async function generatePreAttendance(params: { brokerFirstName: string; leadPhone: string; firstMessage: string }) {
  const brokerFirstName = requireRegisteredBrokerFirstName(params.brokerFirstName);
  return respond({ model: FAST_MODEL, instructions: `${PREATTENDANCE_PROMPT}\nO nome autorizado para apresentação nesta conversa é: ${brokerFirstName}.`, input: JSON.stringify({ ...params, brokerFirstName }), promptType: "pre_attendance" });
}

