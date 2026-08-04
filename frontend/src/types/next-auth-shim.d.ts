// Tipos locais do Auth.js v5; necessários enquanto o pacote beta publica apenas source maps no Windows.
declare module "next-auth" {
  import type { NextRequest } from "next/server";
  export interface User { id: string; name?: string | null; email?: string | null; image?: string | null; role: "ADMIN" | "CORRETOR"; crmEnabled: boolean }
  export interface Session { user: User; expires: string }
  export interface JWT { sub?: string; role?: "ADMIN" | "CORRETOR"; crmEnabled?: boolean; [key: string]: unknown }
  export type NextAuthConfig = {
    trustHost?: boolean; secret?: string; session?: { strategy: "jwt"; maxAge?: number }; pages?: { signIn?: string };
    providers: unknown[];
    callbacks?: {
      jwt?: (args: { token: JWT; user?: User }) => JWT | Promise<JWT>;
      session?: (args: { session: Session; token: JWT }) => Session | Promise<Session>;
    };
  };
  export default function NextAuth(config: NextAuthConfig): {
    handlers: { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> };
    auth: {
      (): Promise<Session | null>;
      (handler: (request: NextRequest & { auth: Session | null }) => Response | Promise<Response>): (request: NextRequest) => Promise<Response>;
    };
    signIn: (...args: unknown[]) => Promise<unknown>;
    signOut: (...args: unknown[]) => Promise<unknown>;
  };
  export function getServerSession(...args: unknown[]): Promise<Session | null>;
}

declare module "next-auth/react" {
  import type { ComponentType, ReactNode } from "react";
  import type { Session } from "next-auth";
  export const SessionProvider: ComponentType<{ children: ReactNode; session?: Session | null }>;
  export function useSession(): { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" };
  export function getSession(): Promise<Session | null>;
  export function signIn(provider?: string, options?: Record<string, unknown>): Promise<{ error?: string | null; ok?: boolean; url?: string | null } | undefined>;
  export function signOut(options?: Record<string, unknown>): Promise<void>;
}
