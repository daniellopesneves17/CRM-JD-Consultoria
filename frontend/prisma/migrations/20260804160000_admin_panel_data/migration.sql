-- Dados reais, configurações e observabilidade do painel administrativo.
SET search_path TO "crm";

ALTER TABLE "Lead"
  ADD COLUMN "currentOperator" TEXT,
  ADD COLUMN "contractEndDate" TIMESTAMP(3);

ALTER TABLE "AutomationRule"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "model" TEXT NOT NULL DEFAULT 'gpt-4o',
  ADD COLUMN "config" JSONB,
  ADD COLUMN "sentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "convertedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastRunAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "AiLog" (
  "id" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptType" TEXT NOT NULL,
  "leadId" TEXT,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "estimatedCostUsd" DECIMAL(10,6) NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CronLog" (
  "id" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "processed" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "detail" TEXT,
  CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErrorLog" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "context" JSONB,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanySettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "name" TEXT NOT NULL DEFAULT 'JD Consultoria e Vendas',
  "cnpj" TEXT,
  "susep" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "logoUrl" TEXT,
  "personaName" TEXT NOT NULL DEFAULT 'Ana',
  "personaTone" TEXT NOT NULL DEFAULT 'friendly',
  "botStartHour" INTEGER NOT NULL DEFAULT 8,
  "botEndHour" INTEGER NOT NULL DEFAULT 20,
  "welcomeMessage" TEXT,
  "offHoursMessage" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Operator" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logoUrl" TEXT,
  "commercialContact" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ObjectionLibrary" (
  "id" TEXT NOT NULL,
  "objection" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ObjectionLibrary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_stage_contractEndDate_idx" ON "Lead"("stage", "contractEndDate");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "AiLog_createdAt_idx" ON "AiLog"("createdAt");
CREATE INDEX "AiLog_leadId_createdAt_idx" ON "AiLog"("leadId", "createdAt");
CREATE INDEX "AiLog_promptType_createdAt_idx" ON "AiLog"("promptType", "createdAt");
CREATE INDEX "CronLog_startedAt_idx" ON "CronLog"("startedAt");
CREATE INDEX "CronLog_jobName_startedAt_idx" ON "CronLog"("jobName", "startedAt");
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
CREATE INDEX "ErrorLog_resolved_createdAt_idx" ON "ErrorLog"("resolved", "createdAt");
CREATE UNIQUE INDEX "Operator_name_key" ON "Operator"("name");
CREATE INDEX "Operator_active_name_idx" ON "Operator"("active", "name");
CREATE UNIQUE INDEX "ObjectionLibrary_objection_key" ON "ObjectionLibrary"("objection");
CREATE INDEX "ObjectionLibrary_active_idx" ON "ObjectionLibrary"("active");

ALTER TABLE "AiLog" ADD CONSTRAINT "AiLog_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
