// Cliente OpenAI e utilitários de resposta estruturada usados pelos três perfis de IA.
import OpenAI from "openai";
import { z } from "zod";

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function parseStructured<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return schema.parse(JSON.parse(cleaned));
}

export async function respond(params: { model: string; instructions: string; input: string; reasoning?: "low" }) {
  const response = await getOpenAI().responses.create({
    model: params.model,
    instructions: params.instructions,
    input: params.input,
    ...(params.reasoning ? { reasoning: { effort: params.reasoning } } : {})
  });
  if (!response.output_text) throw new Error("A IA não retornou conteúdo.");
  return response.output_text;
}

