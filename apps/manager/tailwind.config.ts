import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
      colors: {
        primary: "#00ab00",
        navy: {
          DEFAULT: "#0a2540",
          mid: "#1c3a5f",
          light: "#1e3a5c",
        },
        // NOTE: never add a flat `slate: "<hex>"` override here — it replaces
        // Tailwind's entire slate-50…950 scale and silently breaks every
        // slate-### class on the functional pages (login, KYC, groups, audit).
        // Console had the identical bug; both are now fixed.
      },
      boxShadow: {
        "theme-xs": "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
        "theme-sm": "0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)",
        "theme-md": "0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config

export default config
