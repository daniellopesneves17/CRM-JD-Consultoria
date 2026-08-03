// Autenticação central do CRM: credenciais, JWT e autorização por perfil/estado da conta.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(input: Partial<Record<"email" | "password", unknown>>) {
        const parsed = credentialsSchema.safeParse(input);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.active || !user.crmEnabled) return null;
        if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

        const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
        if (settings && !settings.crmEnabled && user.role !== "ADMIN") return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          crmEnabled: user.crmEnabled
        };
      }
    })
  ],
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
    }
  }
});
