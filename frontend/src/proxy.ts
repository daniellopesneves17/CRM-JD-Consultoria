// Protege o CRM; apenas login e endpoints do NextAuth ficam públicos.
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent, NextRequest } from "next/server";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return withAuth(request as NextRequestWithAuth, event);
}

export const config = { matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"] };
