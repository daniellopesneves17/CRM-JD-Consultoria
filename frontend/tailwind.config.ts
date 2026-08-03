// Tokens visuais compartilhados por toda a interface.
import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f0f4ff", 100: "#dbe4ff", 200: "#bac8ff", 500: "#1a3a8f", 600: "#0d2461", 700: "#0a1628", 900: "#070f1a" },
        gold: { 400: "#d4b483", 500: "#c8a96e", 600: "#b8935a" },
        success: { DEFAULT: "#16a34a", light: "#dcfce7" }, warning: { DEFAULT: "#d97706", light: "#fef3c7" }, danger: { DEFAULT: "#dc2626", light: "#fee2e2" }, muted: "#6b7280"
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { soft: "0 8px 30px rgba(15,23,42,.06)" }
    }
  },
  plugins: []
} satisfies Config;
