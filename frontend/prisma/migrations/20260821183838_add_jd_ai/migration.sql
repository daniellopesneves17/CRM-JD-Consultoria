-- Histórico individual e boletins diários pesquisados pela JD AI.
SET search_path TO "crm";

CREATE TYPE "JdAiMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "JdAiConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Nova conversa',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JdAiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JdAiMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "JdAiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "sources" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JdAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JdAiBriefing" (
  "id" TEXT NOT NULL,
  "researchDate" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sources" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JdAiBriefing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JdAiConversation_userId_updatedAt_idx"
  ON "JdAiConversation"("userId", "updatedAt");
CREATE INDEX "JdAiMessage_conversationId_createdAt_idx"
  ON "JdAiMessage"("conversationId", "createdAt");
CREATE UNIQUE INDEX "JdAiBriefing_researchDate_key"
  ON "JdAiBriefing"("researchDate");
CREATE INDEX "JdAiBriefing_createdAt_idx"
  ON "JdAiBriefing"("createdAt");

ALTER TABLE "JdAiConversation" ADD CONSTRAINT "JdAiConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JdAiMessage" ADD CONSTRAINT "JdAiMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "JdAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "JdAiConversation", "JdAiMessage", "JdAiBriefing" TO "crm_app";
