// Layout raiz, metadados, sessão e inicialização do tema sem flash visual.
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { PwaLifecycle } from "@/components/app/PwaLifecycle";
export const metadata: Metadata = {
  title: { default: "CRM JD", template: "%s | CRM JD" },
  description: "Gestão comercial para corretagem de planos de saúde.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "App JD" },
  icons: {
    icon: [
      { url: "/jd-favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/jd-logo.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/jd-favicon.png",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  }
};
export const viewport: Viewport = { themeColor: "#050608", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript=`(()=>{try{const saved=localStorage.getItem('crm-theme');const dark=saved==='dark'||(!saved&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark)}catch{}})()`;
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body><Providers><PwaLifecycle/>{children}</Providers></body></html>;
}
