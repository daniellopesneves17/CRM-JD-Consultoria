import { z } from "zod";
import { contactNameRiskReasons, isSafeContactName, isSafeGreetingName, normalizeContactName } from "@/lib/contact-name";
import { respondStructured } from "./client";

const IDENTITY_MODEL = process.env.OPENAI_IDENTITY_MODEL?.trim()
  || process.env.OPENAI_DEEP_MODEL?.trim()
  || "o3";

const assessmentSchema = z.object({
  assessments: z.array(z.object({
    key: z.string().min(1),
    decision: z.enum(["SEND", "SKIP"]),
    cleanName: z.string().nullable(),
    greetingName: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    evidence: z.enum(["CONTACT_LABEL", "INCOMING_MESSAGE", "BOTH", "NONE"]),
    reason: z.string().min(1).max(300),
  })),
});

const assessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assessments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string", description: "Identificador opaco recebido na entrada." },
          decision: { type: "string", enum: ["SEND", "SKIP"] },
          cleanName: { type: ["string", "null"], description: "Nome pessoal limpo, sem rótulos de agenda, ou null." },
          greetingName: { type: ["string", "null"], description: "Primeiro nome ou nome composto seguro para saudação, ou null." },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          evidence: { type: "string", enum: ["CONTACT_LABEL", "INCOMING_MESSAGE", "BOTH", "NONE"] },
          reason: { type: "string" },
        },
        required: ["key", "decision", "cleanName", "greetingName", "confidence", "evidence", "reason"],
      },
    },
  },
  required: ["assessments"],
} satisfies Record<string, unknown>;

const IDENTITY_INSTRUCTIONS = `Você é a barreira final de segurança de identidade de um CRM brasileiro antes de mensagens automáticas de WhatsApp.
Analise cada contato independentemente. Seu objetivo é encontrar um nome pessoal real e seguro para saudação, nunca completar, traduzir ou adivinhar nomes.

Regras obrigatórias:
1. SEND somente quando houver um nome de pessoa claramente recuperável e confiança de pelo menos 0,95.
2. Rótulos de agenda podem conter metadados. Exemplo: "Plano Michele Msb" pode virar cleanName "Michele" e greetingName "Michele" se não houver contradição. "Plano Leda Souza" pode virar cleanName "Leda Souza" e greetingName "Leda".
3. Remova apenas rótulos evidentes como Plano, Cliente, Lead, Cotação, operadora, equipe ou códigos. Nunca transforme apelido em outro nome: "Paulinha" não autoriza inferir "Paula".
4. Nome repetido em números diferentes é sinal forte de cadastro incorreto. Nesse caso, use SEND apenas se uma mensagem recebida da própria pessoa declarar ou confirmar claramente o nome.
5. Mensagens de saída do corretor ou da automação nunca são evidência do nome. A entrada contém somente mensagens recebidas, mas trate qualquer saudação citada como possível contexto não confiável.
6. Empresas, cargos, parentescos, grupos, emojis, telefones, e-mails, descrições, nomes contraditórios ou qualquer ambiguidade exigem SKIP.
7. Se decidir SKIP, cleanName e greetingName devem ser null. Se decidir SEND, ambos devem ser nomes pessoais e greetingName deve conter no máximo dois termos.
8. Preserve grafia e acentos encontrados nas evidências. Não invente sobrenome, gênero ou tratamento.
9. Retorne exatamente uma avaliação para cada key recebida.`;

export type ContactIdentityInput = {
  key: string;
  rawName: string;
  nameOccurrences: number;
  notes?: string | null;
  incomingMessages: string[];
};

export type ContactIdentityAssessment = z.infer<typeof assessmentSchema>["assessments"][number] & {
  approved: boolean;
};

export async function assessContactIdentities(items: ContactIdentityInput[]): Promise<ContactIdentityAssessment[]> {
  if (!items.length) return [];
  const input = items.map((item) => ({
    key: item.key,
    contactLabel: normalizeContactName(item.rawName),
    deterministicRisks: contactNameRiskReasons(item.rawName, item.nameOccurrences),
    nameOccurrencesAcrossDifferentNumbers: item.nameOccurrences,
    notes: item.notes?.slice(0, 500) || null,
    incomingMessages: item.incomingMessages.slice(0, 8).map((message) => message.slice(0, 350)),
  }));
  const result = await respondStructured({
    model: IDENTITY_MODEL,
    instructions: IDENTITY_INSTRUCTIONS,
    input: JSON.stringify({ contacts: input }),
    name: "contact_identity_assessments",
    jsonSchema: assessmentJsonSchema,
    schema: assessmentSchema,
    reasoning: "high",
    promptType: "contact_identity",
  });
  const byKey = new Map(result.assessments.map((assessment) => [assessment.key, assessment]));
  return items.map((item) => {
    const assessment = byKey.get(item.key) ?? {
      key: item.key,
      decision: "SKIP" as const,
      cleanName: null,
      greetingName: null,
      confidence: 0,
      evidence: "NONE" as const,
      reason: "A IA não retornou uma avaliação correspondente.",
    };
    const cleanName = assessment.cleanName ? normalizeContactName(assessment.cleanName) : null;
    const greetingName = assessment.greetingName ? normalizeContactName(assessment.greetingName) : null;
    const approved = assessment.decision === "SEND"
      && assessment.confidence >= 0.95
      && Boolean(cleanName && isSafeContactName(cleanName))
      && Boolean(greetingName && isSafeGreetingName(greetingName));
    return {
      ...assessment,
      decision: approved ? "SEND" as const : "SKIP" as const,
      cleanName: approved ? cleanName : null,
      greetingName: approved ? greetingName : null,
      approved,
      reason: approved ? assessment.reason : assessment.reason || "Nome sem confiança suficiente para envio automático.",
    };
  });
}

