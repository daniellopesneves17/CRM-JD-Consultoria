-- Lançamentos manuais de lucro, com atribuição opcional ao corretor e estorno auditável.
SET search_path TO "crm";

CREATE TYPE "ManualProfitCategory" AS ENUM ('COMMISSION', 'BONUS', 'ADJUSTMENT', 'OTHER');

CREATE TABLE "ManualProfit" (
  "id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "category" "ManualProfitCategory" NOT NULL DEFAULT 'OTHER',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  "createdById" TEXT NOT NULL,
  "voidedAt" TIMESTAMP(3),
  "voidedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualProfit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualProfit_userId_occurredAt_idx" ON "ManualProfit"("userId", "occurredAt");
CREATE INDEX "ManualProfit_occurredAt_idx" ON "ManualProfit"("occurredAt");
CREATE INDEX "ManualProfit_voidedAt_idx" ON "ManualProfit"("voidedAt");

ALTER TABLE "ManualProfit" ADD CONSTRAINT "ManualProfit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManualProfit" ADD CONSTRAINT "ManualProfit_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManualProfit" ADD CONSTRAINT "ManualProfit_voidedById_fkey"
  FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
