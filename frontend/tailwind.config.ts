// Tokens visuais compartilhados por toda a interface.
import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f0f7ff", 100: "#dbeafe", 500: "#2563eb", 600: "#1d4ed8", 900: "#1e3a5f" },
        success: "#16a34a", warning: "#d97706", danger: "#dc2626", muted: "#6b7280"
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { soft: "0 8px 30px rgba(15,23,42,.06)" }
    }
  },
  plugins: []
} satisfies Config;
