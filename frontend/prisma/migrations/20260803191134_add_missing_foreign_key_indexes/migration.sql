-- Índices das colunas de chave estrangeira mais usadas em joins e exclusões em cascata.
CREATE INDEX IF NOT EXISTS "Conversation_leadId_idx" ON "crm"."Conversation"("leadId");
CREATE INDEX IF NOT EXISTS "Message_userId_idx" ON "crm"."Message"("userId");
CREATE INDEX IF NOT EXISTS "Proposal_leadId_idx" ON "crm"."Proposal"("leadId");
CREATE INDEX IF NOT EXISTS "Task_leadId_idx" ON "crm"."Task"("leadId");
CREATE INDEX IF NOT EXISTS "Activity_leadId_idx" ON "crm"."Activity"("leadId");
