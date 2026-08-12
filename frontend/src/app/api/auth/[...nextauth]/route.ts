// Expõe o handler de autenticação do NextAuth no App Router.
// Route Handler oficial do Auth.js/NextAuth v5.
import { handlers } from "@/auth";
import { applySessionPersistence, rememberPreferenceFromRequest } from "@/lib/remember-session";

export async function GET(request: Request) {
  return applySessionPersistence(request, await handlers.GET(request));
}

export async function POST(request: Request) {
  const preference = await rememberPreferenceFromRequest(request);
  return applySessionPersistence(request, await handlers.POST(request), preference);
}

