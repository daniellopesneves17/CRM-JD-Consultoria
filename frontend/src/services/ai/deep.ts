// Análises profundas de score, resumo, qualificação e reativação.
import { z } from "zod";
import { parseStructured, respond } from "./client";
import { PERSONA_BASE, QUALIFICATION_PROMPT, REACTIVATION_PROMPT, SCORE_PROMPT, SUMMARY_PROMPT } from "./prompts";

const DEEP_MODEL = process.env.OPENAI_DEEP_MODEL ?? "gpt-5.6-luna";
const FALLBACK_MODEL = process.env.OPENAI_DEEP_FALLBACK_MODEL ?? "o3";

async function deepJson<T>(instructions: string, input: unknown, schema: z.ZodType<T>): Promise<T> {
  try {
    return parseStructured(await respond({ model: DEEP_MODEL, instructions, input: JSON.stringify(input), reasoning: "low" }), schema);
  } catch (error) {
    if (DEEP_MODEL === FALLBACK_MODEL) throw error;
    return parseStructured(await respond({ model: FALLBACK_MODEL, instructions, input: JSON.stringify(input), reasoning: "low" }), schema);
  }
}

const scoreSchema = z.object({ score: z.number().int().min(0).max(100), temperature: z.enum(["FRIO", "MORNO", "QUENTE"]), reasoning: z.string().min(1).max(600) });
export function scoreLeadConversation(params: { leadId: string; allMessages: Array<{ sender: string; content: string; sentAt: Date }>; leadProfile: { name: string; livesCount: number; stage: string; estimatedValue?: number } }) {
  return deepJson(SCORE_PROMPT, params, scoreSchema);
}

const summarySchema = z.object({ summary: z.string(), keyPoints: z.array(z.string()).max(8), nextAction: z.string() });
export function summarizeConversation(params: { conversationId: string; messages: Array<{ sender: string; content: string }> }) {
  return deepJson(SUMMARY_PROMPT, params, summarySchema);
}

const qualificationSchema = z.object({ qualified: z.boolean(), estimatedValue: z.number().nonnegative(), reason: z.string(), suggestedStage: z.string() });
export function qualifyLead(params: { conversationHistory: Array<{ sender: string; content: string }>; leadProfile: { name: string; livesCount: number } }) {
  return deepJson(QUALIFICATION_PROMPT, params, qualificationSchema);
}

const strategySchema = z.object({ message: z.string(), approach: z.string(), bestTime: z.string() });
export function suggestReactivationStrategy(params: { leadProfile: { name: string; stage: string; lostReason?: string; notes?: string }; lastMessages: Array<{ sender: string; content: string }> }) {
  return deepJson(`${PERSONA_BASE}\n${REACTIVATION_PROMPT}\nResponda apenas JSON com message, approach e bestTime.`, params, strategySchema);
}

