// Layout raiz, metadados, sessão e inicialização do tema sem flash visual.
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
export const metadata: Metadata = {
  title: { default: "CRM JD", template: "%s | CRM JD" },
  description: "Gestão comercial para corretagem de planos de saúde.",
  icons: {
    icon: [
      { url: "/jd-favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/jd-logo.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/jd-favicon.png",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript=`(()=>{try{const saved=localStorage.getItem('crm-theme');const dark=saved==='dark'||(!saved&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark)}catch{}})()`;
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body><Providers>{children}</Providers></body></html>;
}
