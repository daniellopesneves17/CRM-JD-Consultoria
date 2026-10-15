-- Permite que cada usuário ative ou pause as automações apenas no próprio CRM.
SET search_path TO "crm";

CREATE TABLE "AutomationPreference" (
  "userId" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationPreference_pkey" PRIMARY KEY ("userId", "automationId")
);

CREATE INDEX "AutomationPreference_automationId_active_idx"
  ON "AutomationPreference"("automationId", "active");

ALTER TABLE "AutomationPreference" ADD CONSTRAINT "AutomationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationPreference" ADD CONSTRAINT "AutomationPreference_automationId_fkey"
  FOREIGN KEY ("automationId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
