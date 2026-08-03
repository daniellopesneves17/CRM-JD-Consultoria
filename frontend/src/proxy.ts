// Protege o CRM; login e integrações autenticadas por segredo próprio ficam públicas.
// Barreira leve de navegação; a autorização definitiva ocorre no layout e em cada API.
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(login);
  }
  if (request.nextUrl.pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|api/webhook|api/cron|_next/static|_next/image|favicon.ico|jd-favicon.png|jd-logo.png|apple-touch-icon.png).*)"
  ]
};
