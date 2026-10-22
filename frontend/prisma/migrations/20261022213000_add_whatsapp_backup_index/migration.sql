-- Mantém no Postgres o índice auditável dos backups criptografados guardados no Storage.
SET search_path TO "crm";

CREATE TABLE "WhatsAppBackup" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "conversationCount" INTEGER NOT NULL,
  "messageCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastOpenedAt" TIMESTAMP(3),
  CONSTRAINT "WhatsAppBackup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppBackup_storagePath_key"
  ON "WhatsAppBackup"("storagePath");

CREATE INDEX "WhatsAppBackup_ownerId_createdAt_idx"
  ON "WhatsAppBackup"("ownerId", "createdAt");

ALTER TABLE "WhatsAppBackup" ADD CONSTRAINT "WhatsAppBackup_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
