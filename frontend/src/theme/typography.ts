import { Azeret_Mono } from "next/font/google";

export const accentFont = Azeret_Mono({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const fonts = {
  heading: "Clash_Display",
  body: "Clash_Display",
  accent: accentFont.style.fontFamily as "Azaret_Mono",
};

export const fontSizes = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.5rem",
  "5xl": "3rem",
  "6xl": "4rem",
  "7xl": "4.5rem",
  "8xl": "6rem",
  "9xl": "8rem",
  "10xl": "9rem",
};

export const fontWeights = {
  "100": 100,
  "200": 200,
  "400": 400,
  "500": 500,
  "600": 600,
  "700": 700,
  "800": 800,
};
