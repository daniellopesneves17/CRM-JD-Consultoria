export type JdAiSource = { title: string; url: string };

export function makeConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Nova conversa";
  return normalized.length <= 58 ? normalized : `${normalized.slice(0, 55).trimEnd()}...`;
}

export function researchDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeJdAiSources(sources: JdAiSource[], limit = 12) {
  const unique = new Map<string, JdAiSource>();
  for (const source of sources) {
    try {
      const url = new URL(source.url);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      const cleanUrl = url.toString();
      if (!unique.has(cleanUrl)) unique.set(cleanUrl, { title: source.title.trim() || url.hostname, url: cleanUrl });
    } catch {
      continue;
    }
  }
  return [...unique.values()].slice(0, limit);
}
