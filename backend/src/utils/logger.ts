// Logger estruturado simples; o Fastify adiciona contexto de requisição automaticamente.
export const loggerOptions = {
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.x-webhook-secret"]
};

