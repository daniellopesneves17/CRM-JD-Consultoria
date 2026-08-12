// Autenticação central do CRM: credenciais, JWT e autorização por perfil/estado da conta.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sharedAuthConfig } from "@/auth.config";
import { rememberPreferenceFromRequest, sessionMaxAge } from "@/lib/remember-session";

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

const credentialsProvider = Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        rememberMe: { label: "Permanecer conectado", type: "checkbox" }
      },
      async authorize(input: Partial<Record<"email" | "password", unknown>>, request: Request) {
        const parsed = credentialsSchema.safeParse(input);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.active || !user.crmEnabled) return null;
        if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;

        const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
        if (settings && !settings.crmEnabled && user.role !== "ADMIN") return null;

        const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        const loggedUser = await prisma.$transaction(async (tx) => {
          const updated = await tx.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), loginCount: { increment: 1 } }
          });
          await tx.accessLog.create({
            data: {
              userId: user.id,
              action: "login",
              ip: forwardedFor || request.headers.get("x-real-ip"),
              userAgent: request.headers.get("user-agent")
            }
          });
          return updated;
        });
        return {
          id: loggedUser.id,
          name: loggedUser.name,
          email: loggedUser.email,
          image: loggedUser.avatarUrl,
          role: loggedUser.role,
          crmEnabled: loggedUser.crmEnabled,
          sessionVersion: loggedUser.sessionVersion
        };
      }
    });

export const { handlers, auth, signIn, signOut } = NextAuth(async (request) => {
  const preference = await rememberPreferenceFromRequest(request);
  return {
    ...sharedAuthConfig,
    session: { strategy: "jwt", maxAge: sessionMaxAge(preference) },
    providers: [credentialsProvider],
  };
});
