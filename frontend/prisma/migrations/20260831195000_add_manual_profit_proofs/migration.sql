-- Comprovantes privados anexados aos lançamentos manuais de lucro.
SET search_path TO "crm";

ALTER TABLE "ManualProfit"
  ADD COLUMN "proofPath" TEXT,
  ADD COLUMN "proofName" TEXT,
  ADD COLUMN "proofType" TEXT,
  ADD COLUMN "proofSize" INTEGER;

CREATE UNIQUE INDEX "ManualProfit_proofPath_key" ON "ManualProfit"("proofPath");
