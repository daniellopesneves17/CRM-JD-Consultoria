// Protege o CRM; apenas login e endpoints do NextAuth ficam públicos.
export { default } from "next-auth/middleware";
export const config = { matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"] };

