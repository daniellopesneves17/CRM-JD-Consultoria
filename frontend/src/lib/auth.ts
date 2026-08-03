// Integra NextAuth ao login do backend Fastify e preserva o JWT no token da sessão.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getBackendUrl } from "@/lib/backend-url";

type BackendAuth = { token: string; refreshToken: string; user: { id: string; name: string; email: string; role: string } };
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
        return {
          ...data.user,
          accessToken: data.token,
          refreshToken: data.refreshToken,
          accessTokenExpires: Date.now() + 7 * 60 * 60 * 1000
        };
      } catch { return null; }
    }
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const source = user as typeof user & { role: string; accessToken: string; refreshToken: string; accessTokenExpires: number };
        token.role = source.role;
        token.accessToken = source.accessToken;
        token.refreshToken = source.refreshToken;
        token.accessTokenExpires = source.accessTokenExpires;
        return token;
      }

      if (typeof token.accessTokenExpires === "number" && Date.now() < token.accessTokenExpires) return token;

      if (typeof token.refreshToken === "string") {
        try {
          const response = await fetch(`${getBackendUrl()}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: token.refreshToken })
          });
          if (!response.ok) throw new Error("Falha ao renovar sessão");
          const refreshed = await response.json() as { token: string };
          token.accessToken = refreshed.token;
          token.accessTokenExpires = Date.now() + 7 * 60 * 60 * 1000;
          delete token.error;
        } catch {
          delete token.accessToken;
          token.error = "RefreshAccessTokenError";
        }
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
