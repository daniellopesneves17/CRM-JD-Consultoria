const DEFAULT_SESSION_MAX_AGE = 8 * 60 * 60;
const REMEMBERED_SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const REMEMBER_SESSION_COOKIE = "crm.remember-session";

export type RememberPreference = "remember" | "session";

export function sessionMaxAge(preference: RememberPreference) {
  return preference === "remember" ? REMEMBERED_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
}

export async function rememberPreferenceFromRequest(request?: Request): Promise<RememberPreference> {
  if (!request) return "session";

  if (isCredentialsCallback(request)) {
    try {
      const form = await request.clone().formData();
      return form.get("rememberMe") === "true" ? "remember" : "session";
    } catch {
      return "session";
    }
  }

  return cookieValue(request.headers.get("cookie"), REMEMBER_SESSION_COOKIE) === "1" ? "remember" : "session";
}

export async function applySessionPersistence(request: Request, response: Response, resolvedPreference?: RememberPreference) {
  const preference = resolvedPreference ?? await rememberPreferenceFromRequest(request);
  const headers = new Headers(response.headers);
  const setCookies = readSetCookies(response.headers);

  if (setCookies.length) {
    headers.delete("set-cookie");
    for (const cookie of setCookies) {
      headers.append("set-cookie", preference === "session" ? makeSessionOnly(cookie) : cookie);
    }
  }

  if (isCredentialsCallback(request)) {
    headers.append("set-cookie", preferenceCookie(preference, request));
  } else if (isSignOut(request)) {
    headers.append("set-cookie", clearPreferenceCookie(request));
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function isCredentialsCallback(request: Request) {
  return request.method === "POST" && new URL(request.url).pathname.endsWith("/api/auth/callback/credentials");
}

function isSignOut(request: Request) {
  return request.method === "POST" && new URL(request.url).pathname.endsWith("/api/auth/signout");
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

function readSetCookies(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") return withGetSetCookie.getSetCookie();
  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function makeSessionOnly(cookie: string) {
  if (!isSessionTokenCookie(cookie) || isDeletionCookie(cookie)) return cookie;
  return cookie
    .replace(/;\s*Expires=[^;]+/gi, "")
    .replace(/;\s*Max-Age=[^;]+/gi, "");
}

function isSessionTokenCookie(cookie: string) {
  return /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/i.test(cookie);
}

function isDeletionCookie(cookie: string) {
  return /;\s*Max-Age=0(?:;|$)/i.test(cookie) || /;\s*Expires=Thu, 01 Jan 1970/i.test(cookie);
}

function preferenceCookie(preference: RememberPreference, request: Request) {
  const parts = [
    `${REMEMBER_SESSION_COOKIE}=${preference === "remember" ? "1" : "0"}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (new URL(request.url).protocol === "https:") parts.push("Secure");
  if (preference === "remember") parts.push(`Max-Age=${REMEMBERED_SESSION_MAX_AGE}`);
  return parts.join("; ");
}

function clearPreferenceCookie(request: Request) {
  const parts = [`${REMEMBER_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (new URL(request.url).protocol === "https:") parts.push("Secure");
  return parts.join("; ");
}
