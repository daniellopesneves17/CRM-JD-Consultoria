-- Contexto persistente definido pelo usuário para cada conversa da JD AI.
SET search_path TO "crm";

ALTER TABLE "JdAiConversation" ADD COLUMN "context" TEXT;
