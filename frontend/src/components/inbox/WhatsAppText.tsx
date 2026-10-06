import { Fragment, type ReactNode } from "react";

const tokenPattern = /(https?:\/\/[^\s]+|```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

function formattedToken(token: string, key: number): ReactNode {
  if (/^https?:\/\//.test(token)) return <a key={key} href={token} target="_blank" rel="noreferrer" className="break-all underline decoration-current/50 underline-offset-2 hover:decoration-current">{token}</a>;
  if (token.startsWith("```") && token.endsWith("```")) return <code key={key} className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[.9em] dark:bg-white/10">{token.slice(3, -3)}</code>;
  if (token.startsWith("*") && token.endsWith("*")) return <strong key={key}>{token.slice(1, -1)}</strong>;
  if (token.startsWith("_") && token.endsWith("_")) return <em key={key}>{token.slice(1, -1)}</em>;
  if (token.startsWith("~") && token.endsWith("~")) return <s key={key}>{token.slice(1, -1)}</s>;
  return token;
}

export function WhatsAppText({ children }: { children: string }) {
  return <p className="whitespace-pre-wrap break-words">{children.split("\n").map((line, lineIndex) => <Fragment key={`${lineIndex}-${line}`}>
    {line.split(tokenPattern).filter(Boolean).map((token, tokenIndex) => formattedToken(token, tokenIndex))}
    {lineIndex < children.split("\n").length - 1 && <br/>}
  </Fragment>)}</p>;
}
