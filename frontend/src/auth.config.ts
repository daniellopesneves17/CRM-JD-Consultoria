import type { NextAuthConfig } from "next-auth";

// Configuração leve e compartilhada: decodifica a sessão sem carregar Prisma ou bcrypt.
export const sharedAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.crmEnabled = user.crmEnabled;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role ?? "CORRETOR";
      session.user.crmEnabled = token.crmEnabled ?? false;
      return session;
    },
  },
} satisfies NextAuthConfig;
