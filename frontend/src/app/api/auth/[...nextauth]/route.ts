// Expõe o handler de autenticação do NextAuth no App Router.
// Route Handler oficial do Auth.js/NextAuth v5.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

