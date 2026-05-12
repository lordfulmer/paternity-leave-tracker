import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0E1A",
          elevated: "#121826",
          card: "#1A2233",
        },
        ink: {
          DEFAULT: "#F1F5F9",
          muted: "#94A3B8",
          dim: "#64748B",
        },
        accent: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
        },
        whoop: {
          green: "#10B981",
          yellow: "#F59E0B",
          red: "#EF4444",
          skip: "#6B7280",
        },
        phase: {
          one: "#3B82F6",
          two: "#F97316",
        },
        border: "#1F2937",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "14px",
        xl: "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
