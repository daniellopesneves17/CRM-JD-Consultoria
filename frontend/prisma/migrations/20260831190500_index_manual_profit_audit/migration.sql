-- Índices de cobertura para as relações de autoria e estorno.
SET search_path TO "crm";

CREATE INDEX "ManualProfit_createdById_idx" ON "ManualProfit"("createdById");
CREATE INDEX "ManualProfit_voidedById_idx" ON "ManualProfit"("voidedById");
