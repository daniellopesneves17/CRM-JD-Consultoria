type ManualProfitScope = {
  actorId: string;
  hasProof: boolean;
  isAdmin: boolean;
  requestedUserId?: string | null;
};

export function resolveManualProfitBeneficiary({ actorId, hasProof, isAdmin, requestedUserId }: ManualProfitScope) {
  if (!isAdmin) {
    if (!hasProof) throw new Error("Anexe um comprovante para registrar seu lucro.");
    return actorId;
  }

  return requestedUserId ?? null;
}
