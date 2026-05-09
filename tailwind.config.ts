import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "#06060a",
          1: "#0b0b13",
          2: "#13131d",
          3: "#1b1b27",
        },
        ink: {
          0: "#ece8df",   // warmer ivory — editorial cream rather than cold white
          1: "#c5c1b8",
          2: "#9a968d",
          3: "#6f6c63",
          4: "#48463f",
        },
        line: {
          1: "rgba(236,232,223,0.06)",
          2: "rgba(236,232,223,0.10)",
          3: "rgba(236,232,223,0.16)",
        },
        accent: {
          DEFAULT: "#e8c982",  // muted warm gold (was bright #fbbf24)
          warm: "#d6b572",
          deep: "#9a7f4d",
          live: "#fbbf24",     // still bright when we genuinely need attention
        },
        cat: {
          music: "#d4498b",     // muted rose — was bright #ec4899
          film: "#9774cb",      // muted lavender — was #a855f7
          sports: "#3fa884",    // muted teal — was #10b981
          business: "#5b85d6",  // muted denim — was #3b82f6
          fashion: "#d4566a",   // muted cherry — was #f43f5e
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Cormorant Garamond", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      backdropBlur: {
        xs: "4px",
        '2xl': "32px",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ticker": "ticker 60s linear infinite",
        "orbit": "orbit 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(251,191,36,0.7)" },
          "70%": { boxShadow: "0 0 0 14px rgba(251,191,36,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(251,191,36,0)" },
        },
        "ticker": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "orbit": {
          to: { transform: "rotate(360deg)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
