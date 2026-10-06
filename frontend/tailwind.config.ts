// Tokens visuais compartilhados por toda a interface.
import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 500: "#2563eb", 600: "#1d4ed8", 700: "#111827", 900: "#050608" },
        gold: { 400: "#93c5fd", 500: "#60a5fa", 600: "#3b82f6" },
        success: { DEFAULT: "#16a34a", light: "#dcfce7" }, warning: { DEFAULT: "#d97706", light: "#fef3c7" }, danger: { DEFAULT: "#dc2626", light: "#fee2e2" }, muted: "#6b7280"
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { soft: "0 8px 30px rgba(15,23,42,.06)" }
    }
  },
  plugins: []
} satisfies Config;
