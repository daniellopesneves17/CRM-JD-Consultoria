// Configuração do único serviço Next.js usado localmente e na Vercel.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer", "bcryptjs"]
};

export default nextConfig;
