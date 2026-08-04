// Cliente OpenAI e utilitários de resposta estruturada usados pelos três perfis de IA.
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function parseStructured<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return schema.parse(JSON.parse(cleaned));
}

type Usage = { input_tokens: number; output_tokens: number };

export function calculateCost(model: string, usage: Usage) {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 0.0000025, output: 0.00001 },
    "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
    o3: { input: 0.00001, output: 0.00004 }
  };
  const exact = pricing[model] ?? Object.entries(pricing).find(([key]) => model.startsWith(key))?.[1];
  const price = exact ?? { input: 0.000005, output: 0.000015 };
  return usage.input_tokens * price.input + usage.output_tokens * price.output;
}

async function logCall(data: { model: string; promptType: string; leadId?: string; usage: Usage; latencyMs: number; success: boolean; errorMessage?: string }) {
  await prisma.aiLog.create({ data: { model: data.model, promptType: data.promptType, leadId: data.leadId, inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, estimatedCostUsd: calculateCost(data.model, data.usage), latencyMs: data.latencyMs, success: data.success, errorMessage: data.errorMessage } }).catch((error: unknown) => console.error("Falha ao registrar uso de IA", error instanceof Error ? error.message : "erro desconhecido"));
}

export async function respond(params: { model: string; instructions: string; input: string; reasoning?: "low"; promptType: string; leadId?: string }) {
  const startedAt = Date.now();
  try {
    const response = await getOpenAI().responses.create({
      model: params.model,
      instructions: params.instructions,
      input: params.input,
      ...(params.reasoning && /^(o\d|gpt-5)/.test(params.model) ? { reasoning: { effort: params.reasoning } } : {})
    });
    const usage = { input_tokens: response.usage?.input_tokens ?? 0, output_tokens: response.usage?.output_tokens ?? 0 };
    if (!response.output_text) throw new Error("A IA não retornou conteúdo.");
    await logCall({ model: response.model, promptType: params.promptType, leadId: params.leadId, usage, latencyMs: Date.now() - startedAt, success: true });
    return response.output_text;
  } catch (error) {
    await logCall({ model: params.model, promptType: params.promptType, leadId: params.leadId, usage: { input_tokens: 0, output_tokens: 0 }, latencyMs: Date.now() - startedAt, success: false, errorMessage: error instanceof Error ? error.message : "Erro desconhecido" });
    throw error;
  }
}

