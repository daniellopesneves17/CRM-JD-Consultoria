// Cálculo de dias úteis, feriados nacionais fixos e Sexta-feira Santa.
const fixedHolidays = new Set(["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"]);

function easterSunday(year: number) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4);
  const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function isWorkday(date: Date) {
  if (date.getDay() === 0 || date.getDay() === 6) return false;
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (fixedHolidays.has(key)) return false;
  const goodFriday = easterSunday(date.getFullYear()); goodFriday.setDate(goodFriday.getDate() - 2);
  return date.toDateString() !== goodFriday.toDateString();
}

function workdaysBetween(start: Date, end: Date) {
  let total = 0; const cursor = new Date(start); cursor.setHours(12, 0, 0, 0);
  while (cursor <= end) { if (isWorkday(cursor)) total += 1; cursor.setDate(cursor.getDate() + 1); }
  return total;
}

export function calculateGoalStatus({ targetValue, currentValue, month, year }: { targetValue: number; currentValue: number; month: number; year: number }) {
  const today = new Date(); const start = new Date(year, month - 1, 1, 12); const end = new Date(year, month, 0, 12);
  const reference = today < start ? start : today > end ? end : today;
  const workdaysTotal = workdaysBetween(start, end); const workdaysElapsed = today < start ? 0 : workdaysBetween(start, reference);
  const workdaysRemaining = today > end ? 0 : workdaysBetween(new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1, 12), end);
  const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const expectedPercentage = workdaysTotal ? (workdaysElapsed / workdaysTotal) * 100 : 100;
  const color = percentage >= expectedPercentage * 1.1 ? "green" : percentage >= expectedPercentage * 0.85 ? "yellow" : "red";
  const dailyNeeded = workdaysRemaining ? Math.max(0, targetValue - currentValue) / workdaysRemaining : 0;
  const projectedEnd = workdaysElapsed ? (currentValue / workdaysElapsed) * workdaysTotal : 0;
  return { percentage: Number(percentage.toFixed(1)), color, workdaysTotal, workdaysElapsed, workdaysRemaining, expectedPercentage: Number(expectedPercentage.toFixed(1)), dailyNeeded: Number(dailyNeeded.toFixed(2)), projectedEnd: Number(projectedEnd.toFixed(2)), onTrack: projectedEnd >= targetValue } as const;
}

