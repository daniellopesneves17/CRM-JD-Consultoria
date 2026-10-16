const BUSINESS_NAME_WORDS = new Set([
  "agencia",
  "assessoria",
  "atendimento",
  "comercial",
  "consultoria",
  "corretora",
  "empresa",
  "equipe",
  "grupo",
  "jd",
  "planos",
  "saude",
  "seguros",
  "vendas",
]);

function comparableWord(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();
}

function titleCasePart(value: string) {
  return value ? `${value[0].toLocaleUpperCase("pt-BR")}${value.slice(1).toLocaleLowerCase("pt-BR")}` : value;
}

export function registeredBrokerFirstName(registeredName: string | null | undefined) {
  const name = registeredName?.trim().replace(/\s+/g, " ");
  if (!name) return null;

  const words = name.split(" ");
  if (words.some((word) => BUSINESS_NAME_WORDS.has(comparableWord(word)))) return null;

  const firstWord = words[0].replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, "");
  if (!/^[\p{L}][\p{L}'’-]{1,39}$/u.test(firstWord)) return null;

  return firstWord
    .split(/([-’'])/u)
    .map((part) => part === "-" || part === "’" || part === "'" ? part : titleCasePart(part))
    .join("");
}

export function requireRegisteredBrokerFirstName(registeredName: string | null | undefined) {
  const firstName = registeredBrokerFirstName(registeredName);
  if (!firstName) {
    throw new Error("O responsável por este CRM precisa ter um nome pessoal cadastrado. Nomes de empresa não podem ser usados para se apresentar ao cliente.");
  }
  return firstName;
}
