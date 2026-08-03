// Classificações econômicas de alto volume para sentimento e intenção.
import { z } from "zod";
import { parseStructured, respond } from "./client";
import { INTENT_PROMPT, SENTIMENT_PROMPT } from "./prompts";

const CHEAP_MODEL = process.env.OPENAI_CHEAP_MODEL ?? "gpt-4o-mini";

export async function analyzeSentiment(messageContent: string) {
  const schema = z.object({ sentiment: z.enum(["POSITIVO", "NEUTRO", "FRUSTRADO", "URGENTE"]), confidence: z.number().min(0).max(1) });
  return parseStructured(await respond({ model: CHEAP_MODEL, instructions: SENTIMENT_PROMPT, input: messageContent }), schema);
}

export async function detectIntent(messageContent: string) {
  const schema = z.object({ intent: z.string().min(1), urgency: z.enum(["low", "medium", "high"]) });
  return parseStructured(await respond({ model: CHEAP_MODEL, instructions: INTENT_PROMPT, input: messageContent }), schema);
}

