import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pc: {
          50: "#EDF7F3",
          100: "#D6F0E8",
          200: "#AFDFD3",
          500: "#2A9478",
          600: "#1A6B5C",
          700: "#145748",
          800: "#0D4035",
          900: "#082B23",
        },
        primary: {
          DEFAULT: "#1A6B5C",
          dark: "#0D4035",
          mid: "#2A9478",
          light: "#D6F0E8",
          lightest: "#EDF7F3",
        },
        paper: "#F7FBF8",
        line: "#E2EDE8",
        muted: "#516965",
        amber: "#E8913A",
        "amber-soft": "#F6C58A",
        ink: "#0D4035",
        surface: "#F7FBF8",
        mist: "#EDF7F3",
        slate: "#0D4035",
      },
      fontFamily: {
        serif: ['var(--font-serif)', "Georgia", "serif"],
        sans: ['var(--font-sans)', "system-ui", "sans-serif"],
        mono: ['var(--font-mono)', "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 20px 40px rgba(8, 43, 35, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
