const BLOCKED_NAME_WORDS = new Set([
  "amor", "banco", "casa", "cliente", "clinica", "contato", "corretor", "corretora",
  "cotacao", "dental", "desconhecido", "empresa", "esposa", "familia", "familiar",
  "filha", "filho", "grupo", "individual", "lead", "loja", "mae", "marido", "mei",
  "msb", "novo", "orcamento", "pai", "plano", "saude", "teste", "trabalho", "vendas",
]);

const NAME_PARTICLES = new Set(["da", "das", "de", "do", "dos", "e"]);
const NAME_WORD = /^\p{L}[\p{L}\p{M}'’\-]*$/u;

function comparable(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
}

export function normalizeContactName(value: string) {
  return value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export function contactNameRiskReasons(rawName: string, occurrences = 1) {
  const name = normalizeContactName(rawName);
  const words = name.split(" ").filter(Boolean);
  const normalizedWords = words.map(comparable);
  const reasons: string[] = [];
  if (name.length < 2 || name.length > 100) reasons.push("tamanho_invalido");
  if (/\d|@|https?:|www\./iu.test(name)) reasons.push("identificador_ou_numero");
  if (words.some((word) => !NAME_WORD.test(word))) reasons.push("simbolos_ou_formatacao");
  if (normalizedWords.some((word) => BLOCKED_NAME_WORDS.has(word))) reasons.push("rotulo_de_agenda");
  if (occurrences > 1) reasons.push("nome_repetido_em_multiplos_numeros");
  if (/^whatsapp\s+\d{4}$/iu.test(name)) reasons.push("nome_generico");
  return [...new Set(reasons)];
}

function isSafeName(value: string, maximumWords: number) {
  const name = normalizeContactName(value);
  const words = name.split(" ").filter(Boolean);
  if (name.length < 2 || name.length > 80 || words.length === 0 || words.length > maximumWords) return false;
  if (words.some((word) => !NAME_WORD.test(word))) return false;
  const normalizedWords = words.map(comparable);
  if (normalizedWords.some((word) => BLOCKED_NAME_WORDS.has(word))) return false;
  if (NAME_PARTICLES.has(normalizedWords[0]!) || NAME_PARTICLES.has(normalizedWords.at(-1)!)) return false;
  return true;
}

export function isSafeContactName(value: string) {
  return isSafeName(value, 6);
}

export function isSafeGreetingName(value: string) {
  return isSafeName(value, 2);
}

