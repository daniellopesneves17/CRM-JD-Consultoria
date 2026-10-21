import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "App JD Consultoria",
    short_name: "App JD",
    description: "Central de atendimento e backups protegidos do WhatsApp da JD Consultoria.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#050608",
    theme_color: "#050608",
    orientation: "portrait-primary",
    categories: ["business", "productivity", "communication"],
    icons: [
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/jd-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Conversas", short_name: "Conversas", url: "/app", icons: [{ src: "/jd-logo.png", sizes: "512x512" }] },
      { name: "CRM completo", short_name: "CRM", url: "/dashboard", icons: [{ src: "/jd-logo.png", sizes: "512x512" }] },
    ],
  };
}
