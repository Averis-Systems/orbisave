import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ── ORBISAVE BRAND DIRECT COLORS ──────────────────────────
        green: {
          DEFAULT: "#00ab00",
          hover: "#009200",
          tint: "#e9f3ed",
          light: "#f0faf0",
        },
        navy: {
          DEFAULT: "#0a2540",
          mid: "#1c3a5f",
          light: "#1e3a5c",
        },
        // Full slate scale restored: the previous flat override
        // (slate: "#4a5c6a") silently killed every text-slate-500 /
        // border-slate-200 / bg-slate-50 utility in the app — they didn't
        // compile at all and elements fell back to inherited colors.
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
        ink: "#0f1924",
      },
      // Design rule: corner radius never exceeds 5px — flat, professional
      // banking look. Every rounded-md/lg/xl/2xl/3xl in the codebase (cards,
      // buttons, inputs, dashboards) collapses to the 5px cap here instead
      // of being chased through hundreds of class strings. rounded-full is
      // intentionally untouched (circles: avatars, dots, pill badges).
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
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        iconBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        iconFlash: {
          "0%, 80%, 100%": { opacity: "1" },
          "88%": { opacity: "0.2" },
          "93%": { opacity: "1" },
          "97%": { opacity: "0.3" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.12)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "icon-bounce": "iconBounce 2.4s ease-in-out infinite",
        "icon-flash": "iconFlash 3s ease-in-out infinite",
        "icon-spin-slow": "spinSlow 8s linear infinite",
        "icon-pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
} satisfies Config

export default config
