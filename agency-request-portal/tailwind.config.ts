import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // KFH-leaning professional palette: deep teal primary on a cool slate ground.
        brand: {
          50: "#eefaf7",
          100: "#d3f2ea",
          200: "#a9e4d7",
          300: "#74cfbe",
          400: "#42b3a1",
          500: "#249787",
          600: "#17796d",
          700: "#146159",
          800: "#134d48",
          900: "#12403c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
