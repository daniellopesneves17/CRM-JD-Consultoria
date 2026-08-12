// Contratos, validações e cálculos compartilhados pela gestão administrativa de usuários.
import { z } from "zod";

export const strongPasswordSchema = z.string()
  .min(8, "Senha deve ter ao menos 8 caracteres")
  .max(128, "Senha deve ter no máximo 128 caracteres")
  .regex(/[A-Z]/, "Senha deve ter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve ter ao menos um número");

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(["ADMIN", "CORRETOR"]),
  password: strongPasswordSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(["ADMIN", "CORRETOR"]).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo para atualizar.");

export const resetPasswordSchema = z.object({
  type: z.enum(["manual", "generated"]),
  password: strongPasswordSchema,
});

export function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

export function firstResponseAverage(conversations: Array<{ messages: Array<{ sender: string; sentAt: Date }> }>) {
  const minutes = conversations.map((conversation) => {
    const firstLead = conversation.messages.find((message) => message.sender === "LEAD");
    const firstReply = firstLead && conversation.messages.find((message) => message.sender !== "LEAD" && message.sentAt > firstLead.sentAt);
    return firstLead && firstReply ? Math.max(0, (firstReply.sentAt.getTime() - firstLead.sentAt.getTime()) / 60_000) : null;
  }).filter((value): value is number => value !== null);
  return minutes.length ? Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length) : 0;
}

export function requestOrigin(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}
