import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#090A14",
        card: "#111325",
        accent: "#6D7CFF",
        mint: "#0FD4B6"
      },
      boxShadow: {
        glow: "0 20px 45px rgba(24, 31, 74, 0.45)",
        soft: "0 12px 24px rgba(8, 11, 29, 0.26)"
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(circle at top right, rgba(109,124,255,0.28), transparent 45%), radial-gradient(circle at 25% 35%, rgba(15,212,182,0.18), transparent 35%)"
      }
    }
  },
  plugins: []
};

export default config;
