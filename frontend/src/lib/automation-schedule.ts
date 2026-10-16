export type ScheduledAutomationConfig = {
  horario_programado?: unknown;
  janela_horario?: unknown;
};

export function saoPauloClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function scheduledMinutes(config: ScheduledAutomationConfig) {
  const value = typeof config.horario_programado === "string"
    ? config.horario_programado
    : typeof config.janela_horario === "string"
      ? config.janela_horario
      : "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function isScheduledAutomationDue(config: ScheduledAutomationConfig, now = new Date()) {
  const scheduled = scheduledMinutes(config);
  if (scheduled == null) return false;
  return saoPauloClock(now).minutes >= scheduled;
}
