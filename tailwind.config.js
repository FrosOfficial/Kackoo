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
          900: "#0a0a0f",
          800: "#12121a",
          700: "#1a1a26",
          600: "#222233",
        },
        online: {
          DEFAULT: "#06b6d4",
          dim: "#0e7490",
          bg: "rgba(6, 182, 212, 0.12)",
        },
        inperson: {
          DEFAULT: "#f59e0b",
          dim: "#b45309",
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
