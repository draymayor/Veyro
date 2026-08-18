import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#E8674A",
        background: "#FAF7F2",
        ink: "#1C1B29",
        success: "#8A9B7E",
        error: "#C24E3D",
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)"],
        body: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};

export default config;
