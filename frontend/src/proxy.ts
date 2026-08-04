// Protege o CRM; login e integrações autenticadas por segredo próprio ficam públicas.
// Barreira leve de navegação; as APIs ainda fazem a autorização definitiva no banco.
import { auth } from "@/auth-session";
import { NextResponse } from "next/server";

export default auth((request) => {
  const session = request.auth;
  if (!session?.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(login);
  }
  if (!session.user.crmEnabled) {
    return NextResponse.redirect(new URL("/login?blocked=1", request.url));
  }
  if (request.nextUrl.pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|api/webhook|api/cron|_next/static|_next/image|favicon.ico|jd-favicon.png|jd-logo.png|apple-touch-icon.png).*)"
  ]
};
