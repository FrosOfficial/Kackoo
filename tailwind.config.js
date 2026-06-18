/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#0A0A0F",
          800: "#12121A",
          700: "#1A1A24",
          600: "#222230",
        },
        accent: {
          DEFAULT: "#F59E0B",
          dim: "#D97706",
          bg: "rgba(245, 158, 11, 0.12)",
        },
        online: {
          DEFAULT: "#D4A006",
          dim: "#A37B04",
          bg: "rgba(212, 160, 6, 0.12)",
        },
        inperson: {
          DEFAULT: "#F59E0B",
          dim: "#B45309",
          bg: "rgba(245, 158, 11, 0.12)",
        },
      },
      borderRadius: {
        card: "16px",
        pill: "24px",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
