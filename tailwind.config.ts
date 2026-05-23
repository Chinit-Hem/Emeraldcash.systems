import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
        },
        glass: {
          bg: "var(--glass-bg)",
          "bg-soft": "var(--glass-bg-soft)",
          border: "var(--glass-border)",
          "border-strong": "var(--glass-border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        accent: {
          green: "var(--accent-green)",
          "green-hover": "var(--accent-green-hover)",
          "green-active": "var(--accent-green-active)",
          "green-soft": "var(--accent-green-soft)",
          red: "var(--accent-red)",
          "red-hover": "var(--accent-red-hover)",
          "red-active": "var(--accent-red-active)",
          "red-soft": "var(--accent-red-soft)",
        },
        /* Backward compatibility aliases */
        card: "var(--bg-elevated)",
        border: "var(--glass-border)",
        muted: "var(--text-secondary)",
        primary: "var(--accent-green)",
        danger: "var(--accent-red)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
        "glow-green": "0 0 20px var(--accent-green-soft)",
        "glow-red": "0 0 20px var(--accent-red-soft)",
      },
      fontFamily: {
        sans: ['var(--font-inter)', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        khmer: ['var(--font-kantumruy-pro)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        300: "300ms",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
