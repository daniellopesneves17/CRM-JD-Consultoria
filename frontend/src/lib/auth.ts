// Integra NextAuth ao login do backend Fastify e preserva o JWT no token da sessão.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { readAdminStore, verifyPassword } from "@/lib/admin-store";
import { getBackendUrl } from "@/lib/backend-url";

type BackendAuth = { token: string; user: { id: string; name: string; email: string; role: string } };
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [CredentialsProvider({
    name: "Credenciais",
    credentials: { email: { label: "E-mail", type: "email" }, password: { label: "Senha", type: "password" } },
    async authorize(credentials) {
      try {
        const response = await fetch(`${getBackendUrl()}/auth/login`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials?.email, password: credentials?.password })
        });
        if (!response.ok) return null;
        const data = await response.json() as BackendAuth;
        return { ...data.user, accessToken: data.token };
      } catch {
        if (process.env.NODE_ENV === "production" || !credentials?.email || !credentials.password) return null;
        const store = await readAdminStore();
        const account = store.accounts.find((item) => item.email.toLowerCase() === credentials.email?.toLowerCase());
        if (!account || !account.active || !account.crmEnabled || !verifyPassword(credentials.password, account.passwordHash)) return null;
        if (!store.settings.crmEnabled && account.role !== "ADMIN") return null;
        return { id: account.id, name: account.name, email: account.email, role: account.role, accessToken: "local-only" };
      }
    }
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const source = user as typeof user & { role: string; accessToken: string };
        token.role = source.role; token.accessToken = source.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role?: string }).role = token.role as string;
        (session as typeof session & { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    }
  }
};
