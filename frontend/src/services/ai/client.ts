// Cliente OpenAI e utilitários de resposta estruturada usados pelos três perfis de IA.
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function getAiConfiguration() {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const provider = openRouterApiKey ? "openrouter" : "openai";
  const apiKey = openRouterApiKey || openAiApiKey;
  const baseURL = provider === "openrouter"
    ? process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_BASE_URL
    : process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

  return { apiKey, baseURL, provider } as const;
}

export function isAiConfigured() {
  return Boolean(getAiConfiguration().apiKey);
}

export function getOpenAI() {
  const { apiKey, baseURL, provider } = getAiConfiguration();
  if (!apiKey) throw new Error("AI_API_KEY não configurada.");
  return new OpenAI({
    apiKey,
    baseURL,
    ...(provider === "openrouter" ? {
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER?.trim() || "https://crm-jd-consultoria.vercel.app",
        "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "CRM JD Consultoria",
      },
    } : {}),
  });
}

export function getTranscriptionModel() {
  const { provider } = getAiConfiguration();
  return provider === "openrouter"
    ? process.env.OPENROUTER_TRANSCRIPTION_MODEL?.trim() || "openai/whisper-large-v3-turbo"
    : process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1";
}

export function parseStructured<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return schema.parse(JSON.parse(cleaned));
}

type Usage = { input_tokens: number; output_tokens: number };

type TextResponse = {
  output_text?: string | null;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string | null }> }>;
};

export function getResponseText(response: TextResponse) {
  const aggregate = response.output_text?.trim();
  if (aggregate) return aggregate;
  return (response.output ?? [])
    .flatMap((item) => item.type === "message" ? item.content ?? [] : [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function calculateCost(model: string, usage: Usage) {
  const pricing: Record<string, { input: number; output: number }> = {
    "openai/gpt-5.6-luna-pro": { input: 0.00000008, output: 0.0000004 },
    "openai/gpt-5.6-luna": { input: 0.00000008, output: 0.0000004 },
    "gpt-4o": { input: 0.0000025, output: 0.00001 },
    "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
    o3: { input: 0.00001, output: 0.00004 }
  };
  const exact = pricing[model] ?? Object.entries(pricing).find(([key]) => model.startsWith(key))?.[1];
  const price = exact ?? { input: 0.000005, output: 0.000015 };
  return usage.input_tokens * price.input + usage.output_tokens * price.output;
}

export async function logAiCall(data: { model: string; promptType: string; leadId?: string; usage: Usage; latencyMs: number; success: boolean; errorMessage?: string }) {
  await prisma.aiLog.create({ data: { model: data.model, promptType: data.promptType, leadId: data.leadId, inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, estimatedCostUsd: calculateCost(data.model, data.usage), latencyMs: data.latencyMs, success: data.success, errorMessage: data.errorMessage } }).catch((error: unknown) => console.error("Falha ao registrar uso de IA", error instanceof Error ? error.message : "erro desconhecido"));
}

export async function respond(params: { model: string; instructions: string; input: string; reasoning?: "low"; promptType: string; leadId?: string }) {
  const startedAt = Date.now();
  try {
    const response = await getOpenAI().responses.create({
      model: params.model,
      instructions: params.instructions,
      input: params.input,
      ...(params.reasoning && /(^|\/)(o\d|gpt-[56])/.test(params.model) ? { reasoning: { effort: params.reasoning } } : {})
    });
    const usage = { input_tokens: response.usage?.input_tokens ?? 0, output_tokens: response.usage?.output_tokens ?? 0 };
    const outputText = getResponseText(response);
    if (!outputText) throw new Error("A IA não retornou conteúdo.");
    await logAiCall({ model: response.model, promptType: params.promptType, leadId: params.leadId, usage, latencyMs: Date.now() - startedAt, success: true });
    return outputText;
  } catch (error) {
    await logAiCall({ model: params.model, promptType: params.promptType, leadId: params.leadId, usage: { input_tokens: 0, output_tokens: 0 }, latencyMs: Date.now() - startedAt, success: false, errorMessage: error instanceof Error ? error.message : "Erro desconhecido" });
    throw error;
  }
}

