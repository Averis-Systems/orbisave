import type { Config } from "tailwindcss"

const config = {
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
        slate: "#4a5c6a",
      },
      borderRadius: {
        DEFAULT: "5px",
        sm: "4px",
        md: "5px",
        lg: "5px",
        xl: "5px",
        "2xl": "5px",
      },
    },
  },
  plugins: [],
} satisfies Config

export default config
