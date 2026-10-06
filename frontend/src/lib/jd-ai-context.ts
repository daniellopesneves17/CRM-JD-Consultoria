const MAX_CONTEXT_LENGTH = 8000;

export type JdAiContextCommand = { type: "append"; content: string } | { type: "clear" };

export function parseJdAiContextCommand(message: string): JdAiContextCommand | null {
  const normalized = message.trim();
  if (/^\/(?:limpar|clear)\s+contexto\s*$/i.test(normalized) || /^contexto\s*:\s*(?:limpar|apagar)\s*$/i.test(normalized)) {
    return { type: "clear" };
  }
  const match = normalized.match(/^(?:\/contexto|contexto\s*:|guardar\s+como\s+contexto\s*:|considere\s+como\s+contexto\s*:|lembre(?:-se)?\s+que\s*:)[ \t]*([\s\S]+)$/i);
  const content = match?.[1]?.trim();
  return content ? { type: "append", content } : null;
}

export function mergeJdAiContext(existing: string | null | undefined, addition: string) {
  const previous = existing?.trim() ?? "";
  const next = previous ? `${previous}\n- ${addition.trim()}` : `- ${addition.trim()}`;
  return next.length <= MAX_CONTEXT_LENGTH ? next : next.slice(-MAX_CONTEXT_LENGTH);
}

export const JD_AI_CONTEXT_LIMIT = MAX_CONTEXT_LENGTH;
