import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    // The shared admin kit ships classes of its own; without this glob
    // Tailwind purges them and the package renders unstyled.
    '../../packages/admin-ui/src/**/*.{ts,tsx}',
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
        // Full slate scale. NOTE: never add a flat `slate: "<hex>"` override
        // here. That replaces Tailwind's entire slate-50...950 ramp and
        // silently breaks every slate-### class in the app. Pages here use
        // `text-slate/40` style opacity syntax against slate.DEFAULT, so both
        // the DEFAULT and the numeric ramp must exist.
        slate: {
          DEFAULT: "#4a5c6a",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      // Corner radius never exceeds 5px, matching the member app's flat
      // banking look. Without this block every rounded-2xl/3xl in the admin
      // portals rendered at Tailwind's stock 16px/24px while the same class
      // rendered at 5px in the member app, so the three apps looked like
      // different products. rounded-full is intentionally untouched.
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "5px",
        lg: "5px",
        xl: "5px",
        "2xl": "5px",
        "3xl": "5px",
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
