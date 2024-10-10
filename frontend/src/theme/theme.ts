import { buttonTheme } from "@/components/Button/Button";
import { extendTheme } from "@chakra-ui/react";
import { fonts, fontSizes, fontWeights } from "./typography";
import { colors as themeColors } from "./colors";

const breakpoints = {
  base: "0",
  mobile: "375px",
  tablet: "834px",
  tabletL: "935px",
  desktop: "1440px",
};

const sizes = {
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "1.75rem",
  "8": "2rem",
  "9": "2.25rem",
  "10": "2.5rem",
  "12": "3rem",
  "14": "3.5rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "28": "7rem",
  "32": "8rem",
  "36": "9rem",
  "40": "10rem",
  "44": "11rem",
  "48": "12rem",
  "52": "13rem",
  "56": "14rem",
  "60": "15rem",
  "64": "16rem",
  "72": "18rem",
  "80": "20rem",
  "96": "24rem",
  px: "1px",
  "0.5": "0.125rem",
  "1.5": "0.375rem",
  "2.5": "0.625rem",
  "3.5": "0.875rem",
  max: "max-content",
  min: "min-content",
  full: "100%",
  "3xs": "14rem",
  "2xs": "16rem",
  xs: "20rem",
  sm: "24rem",
  md: "28rem",
  lg: "32rem",
  xl: "36rem",
  "2xl": "42rem",
  "3xl": "48rem",
  "4xl": "56rem",
  "5xl": "64rem",
  "6xl": "72rem",
  "7xl": "80rem",
  "8xl": "90rem",
  prose: "60ch",
  container: {
    mobile: breakpoints.mobile,
    tablet: breakpoints.tablet,
    desktop: breakpoints.desktop,
  },
};

const theme = extendTheme({
  semanticTokens: {
    colors: {
      "chakra-body-text": { _light: themeColors.greyscale[900], _dark: themeColors.greyscale[900] },
      "chakra-body-bg": { _light: themeColors.greyscale[100], _dark: themeColors.greyscale[900] },
      "chakra-border-color": {
        _light: themeColors.greyscale[200],
        _dark: themeColors.greyscale[800],
      },
      "chakra-inverse-text": {
        _light: themeColors.greyscale[100],
        _dark: themeColors.greyscale[900],
      },
      "chakra-subtle-bg": { _light: themeColors.greyscale[100], _dark: themeColors.greyscale[900] },
      "chakra-subtle-text": {
        _light: themeColors.greyscale[900],
        _dark: themeColors.greyscale[100],
      },
      "chakra-placeholder-color": {
        _light: themeColors.greyscale[200],
        _dark: themeColors.greyscale[800],
      },
      "chakra-header-bg": { _light: themeColors.greyscale[100], _dark: themeColors.greyscale[900] },
      "chakra-footer-bg": { _light: themeColors.greyscale[100], _dark: themeColors.greyscale[900] },
      "chakra-accent": { _light: themeColors.brand.primary, _dark: themeColors.brand.primary },
    },
  },
  colors: themeColors,
  breakpoints,
  sizes,
  fonts,
  fontSizes,
  fontWeights,
  config: { useSystemColorMode: false, initialColorMode: "light", cssVarPrefix: "chakra" },
  components: {
    Button: buttonTheme,
  },
});

export default theme;
