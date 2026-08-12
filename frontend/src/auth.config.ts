import type { NextAuthConfig } from "next-auth";
import { sessionMaxAge } from "@/lib/remember-session";

// Configuração leve e compartilhada: decodifica a sessão sem carregar Prisma ou bcrypt.
export const sharedAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: sessionMaxAge("session") },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.crmEnabled = user.crmEnabled;
        token.sessionVersion = user.sessionVersion;
      }
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.image === "string") token.picture = session.image;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role ?? "CORRETOR";
      session.user.crmEnabled = token.crmEnabled ?? false;
      session.user.sessionVersion = token.sessionVersion ?? 0;
      return session;
    },
  },
} satisfies NextAuthConfig;
