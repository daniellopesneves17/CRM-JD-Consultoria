// Funções puras de datas, percentuais e normalização usadas pelas APIs administrativas.
export function monthBounds(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  const previousStart = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  return { start, end, previousStart };
}

export function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 10_000) / 100 : 0;
}

export function variation(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10_000) / 100;
}

export function normalizeBrazilPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("55")) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) throw new Error("WhatsApp inválido.");
  return `+${digits}`;
}

export function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
