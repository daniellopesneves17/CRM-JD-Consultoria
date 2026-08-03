// Usa a raiz do monorepo para manter o rastreamento de arquivos e o Turbopack alinhados na Vercel.
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  turbopack: { root: path.resolve(process.cwd(), "..") }
};
export default nextConfig;
