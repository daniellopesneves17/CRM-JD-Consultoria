-- Configurações privadas de Uazapi por corretor.
SET search_path TO "crm";

ALTER TABLE "User" ADD COLUMN "uazapiBaseUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "uazapiToken" TEXT;
ALTER TABLE "User" ADD COLUMN "uazapiInstance" TEXT;
CREATE UNIQUE INDEX "User_uazapiToken_key" ON "User"("uazapiToken") WHERE "uazapiToken" IS NOT NULL;
