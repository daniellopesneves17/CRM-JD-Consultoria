-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- Keep CRM tables outside the schemas exposed by the Supabase Data API.
REVOKE ALL ON SCHEMA "crm" FROM PUBLIC;
SET search_path TO "crm";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CORRETOR');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('NOVO', 'QUALIFICADO', 'PROPOSTA_ENVIADA', 'EM_ANALISE', 'NEGOCIACAO', 'FECHADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "Temperature" AS ENUM ('FRIO', 'MORNO', 'QUENTE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WHATSAPP', 'FORMULARIO', 'INDICACAO', 'IMPORTACAO', 'LIGACAO');

-- CreateEnum
CREATE TYPE "ConvStatus" AS ENUM ('BOT', 'HUMANO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVO', 'NEUTRO', 'FRUSTRADO', 'URGENTE');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('LEAD', 'BOT', 'CORRETOR');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'AUDIO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('RASCUNHO', 'ENVIADA', 'VISUALIZADA', 'ACEITA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FOLLOWUP', 'LIGACAO', 'PROPOSTA', 'REATIVACAO');

-- CreateEnum
CREATE TYPE "UpdatePolicy" AS ENUM ('AUTOMATIC', 'ON_COMPLETION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CORRETOR',
    "phone" TEXT,
    "avatarUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "crmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "livesCount" INTEGER NOT NULL DEFAULT 1,
    "stage" "PipelineStage" NOT NULL DEFAULT 'NOVO',
    "score" INTEGER NOT NULL DEFAULT 0,
    "temperature" "Temperature" NOT NULL DEFAULT 'FRIO',
    "estimatedValue" DECIMAL(65,30),
    "source" "LeadSource" NOT NULL DEFAULT 'WHATSAPP',
    "notes" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "cancelReason" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "uazapiChatId" TEXT,
    "status" "ConvStatus" NOT NULL DEFAULT 'BOT',
    "sentiment" "Sentiment" NOT NULL DEFAULT 'NEUTRO',
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "transcription" TEXT,
    "userId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "coverage" TEXT NOT NULL,
    "monthlyValue" DECIMAL(65,30) NOT NULL,
    "lives" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'RASCUNHO',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "targetValue" DECIMAL(65,30) NOT NULL,
    "currentValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "type" "TaskType" NOT NULL DEFAULT 'FOLLOWUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "delayHours" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "crmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatePolicy" "UpdatePolicy" NOT NULL DEFAULT 'ON_COMPLETION',
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'CRM temporariamente indisponível para atualização.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_stage_temperature_score_idx" ON "Lead"("stage", "temperature", "score");

-- CreateIndex
CREATE INDEX "Lead_userId_lastActivityAt_idx" ON "Lead"("userId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_userId_month_year_key" ON "Goal"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
