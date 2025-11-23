import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          light: "var(--surface-light)",
        },
        sage: {
          100: "var(--sage-100)",
          200: "var(--sage-200)",
          300: "var(--sage-300)",
          400: "var(--sage-400)",
          500: "var(--sage-500)",
          600: "var(--sage-600)",
          700: "var(--sage-700)",
          800: "var(--sage-800)",
        },
        "warm-gray": {
          100: "var(--warm-gray-100)",
          200: "var(--warm-gray-200)",
          300: "var(--warm-gray-300)",
          400: "var(--warm-gray-400)",
          500: "var(--warm-gray-500)",
          600: "var(--warm-gray-600)",
          700: "var(--warm-gray-700)",
          800: "var(--warm-gray-800)",
          900: "var(--warm-gray-900)",
        },
        tier: {
          1: "var(--tier-1)",
          2: "var(--tier-2)",
          3: "var(--tier-3)",
          4: "var(--tier-4)",
          5: "var(--tier-5)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        'tnum': '"tnum"',
      },
    },
  },
  plugins: [],
};

export default config;
