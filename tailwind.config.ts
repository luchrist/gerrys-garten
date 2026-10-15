import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bone: "#F5F8F9",
        creme: "#E7EEF1",
        ink: "#0F1518",
        petrol: {
          50: "#E8F4F9",
          100: "#C9E5F0",
          200: "#96CCE1",
          300: "#5FB0CF",
          400: "#2F95BC",
          500: "#0A7BA5",
          600: "#08668A",
          700: "#075270",
          800: "#063F56",
          900: "#042B3B"
        },
        sonne: {
          50: "#FCF6E8",
          100: "#F8E9C4",
          200: "#F1D38C",
          300: "#E9BC55",
          400: "#E0A526",
          500: "#C68B12",
          600: "#A0700F",
          700: "#7A560C",
          800: "#563C08",
          900: "#332405"
        },
        schiefer: {
          50: "#F2F4F5",
          100: "#E2E6E8",
          200: "#C5CDD1",
          300: "#A5B0B6",
          400: "#86939A",
          500: "#6B7880",
          600: "#545F66",
          700: "#40494E",
          800: "#2D3438",
          900: "#1C2124"
        }
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"]
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      }
    }
  },
  plugins: []
};

export default config;
