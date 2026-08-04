import NextAuth from "next-auth";
import { sharedAuthConfig } from "@/auth.config";

// Usado em layouts e no proxy para manter as transições livres das dependências de banco.
export const { auth } = NextAuth(sharedAuthConfig);
