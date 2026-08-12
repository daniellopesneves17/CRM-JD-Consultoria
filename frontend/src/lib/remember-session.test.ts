import assert from "node:assert/strict";
import test from "node:test";
import { applySessionPersistence, rememberPreferenceFromRequest, sessionMaxAge } from "./remember-session";

test("usa 30 dias somente quando permanecer conectado está marcado", async () => {
  const remembered = new Request("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    body: new URLSearchParams({ rememberMe: "true" }),
  });
  const regular = new Request("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    body: new URLSearchParams({ rememberMe: "false" }),
  });

  assert.equal(await rememberPreferenceFromRequest(remembered), "remember");
  assert.equal(await rememberPreferenceFromRequest(regular), "session");
  assert.equal(sessionMaxAge("remember"), 30 * 24 * 60 * 60);
  assert.equal(sessionMaxAge("session"), 8 * 60 * 60);
});

test("mantém o cookie de sessão persistente quando a opção está marcada", async () => {
  const request = new Request("https://crm.example.com/api/auth/callback/credentials", {
    method: "POST",
    body: new URLSearchParams({ rememberMe: "true" }),
  });
  const response = new Response(null, {
    headers: { "set-cookie": "__Secure-authjs.session-token=abc; Path=/; HttpOnly; Expires=Fri, 11 Sep 2026 00:00:00 GMT" },
  });

  const result = await applySessionPersistence(request, response);
  const cookies = result.headers.getSetCookie();
  assert.match(cookies[0], /Expires=/);
  assert.match(cookies.join("\n"), /crm\.remember-session=1/);
  assert.match(cookies.join("\n"), /Max-Age=2592000/);
  assert.match(cookies.join("\n"), /Secure/);
});

test("transforma o cookie comum em cookie da janela e preserva exclusão", async () => {
  const request = new Request("http://localhost:3000/api/auth/session", {
    headers: { cookie: "crm.remember-session=0" },
  });
  const response = new Response(null, {
    headers: { "set-cookie": "authjs.session-token=abc; Path=/; HttpOnly; Expires=Fri, 11 Sep 2026 00:00:00 GMT; Max-Age=28800" },
  });

  const result = await applySessionPersistence(request, response);
  const cookie = result.headers.getSetCookie()[0];
  assert.doesNotMatch(cookie, /Expires=/);
  assert.doesNotMatch(cookie, /Max-Age=/);

  const deletion = await applySessionPersistence(request, new Response(null, {
    headers: { "set-cookie": "authjs.session-token=; Path=/; HttpOnly; Max-Age=0" },
  }));
  assert.match(deletion.headers.getSetCookie()[0], /Max-Age=0/);
});
