-- Gestão administrativa de usuários, auditoria de acesso e invalidação de sessões.
SET search_path TO "crm";

ALTER TABLE "User"
  ADD COLUMN "loginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AccessLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccessLog_userId_createdAt_idx" ON "AccessLog"("userId", "createdAt");
CREATE INDEX "AccessLog_action_createdAt_idx" ON "AccessLog"("action", "createdAt");

ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
