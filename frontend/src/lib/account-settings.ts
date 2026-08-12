import { z } from "zod";
import { strongPasswordSchema } from "@/lib/admin-users";

export const profileSettingsSchema = z.object({
  type: z.literal("profile"),
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  phone: z.string().trim().max(30).optional().nullable(),
});

export const passwordSettingsSchema = z.object({
  type: z.literal("password"),
  currentPassword: z.string().min(8).max(128),
  newPassword: strongPasswordSchema,
});

export const accountSettingsSchema = z.discriminatedUnion("type", [profileSettingsSchema, passwordSettingsSchema]);
