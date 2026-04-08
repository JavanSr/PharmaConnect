import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--pc-primary)",
          dark: "var(--pc-primary-dark)",
          mid: "var(--pc-primary-mid)",
          light: "var(--pc-primary-light)",
          mist: "var(--pc-primary-mist)",
        },
        pc: {
          50: "#EDF7F3",
          100: "#D6F0E8",
          200: "#AADDD0",
          300: "#7DC9B6",
          400: "#4FB49A",
          500: "#2A9478",
          600: "#1A6B5C",
          700: "#145748",
          800: "#0D4035",
          900: "#062820",
        },
        amber: "#D97706",
        slate: "#1E293B",
        "slate-mid": "#64748B",
        mist: "#F8FAFB",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
