-- Permite marcar manualmente uma conversa como urgente.
SET search_path TO "crm";

ALTER TABLE "Conversation" ADD COLUMN "isUrgent" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Conversation_isUrgent_updatedAt_idx" ON "Conversation"("isUrgent", "updatedAt");
