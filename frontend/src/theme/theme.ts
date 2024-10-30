import { buttonTheme } from "@/components/Button/Button";
import { extendTheme } from "@chakra-ui/react";
import { fonts, fontSizes, fontWeights } from "./typography";
import { lightColors as lightThemeColors, darkColors as darkThemeColors } from "./colors";

const breakpoints = {
  base: "0",
  mobile: "375px",
  mobileL: "570px",
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
      "bg-color": {
        _light: lightThemeColors.greyscale[100],
        _dark: darkThemeColors.greyscale[900],
      },
      "header-bg": {
        _light: lightThemeColors.brand.purple0,
        _dark: darkThemeColors.greyscale[900],
      },
      "footer-bg": {
        _light: lightThemeColors.brand.purple0,
        _dark: darkThemeColors.greyscale[900],
      },
      "border-color": {
        _light: lightThemeColors.greyscale[200],
        _dark: darkThemeColors.greyscale[500],
      },
      "item-bg": {
        _light: lightThemeColors.greyscale[0],
        _dark: darkThemeColors.greyscale[900],
      },
      "input-bg": {
        _light: lightThemeColors.greyscale[0],
        _dark: darkThemeColors.greyscale[700],
      },
      "input-right-bg": {
        _light: lightThemeColors.greyscale[100],
        _dark: darkThemeColors.greyscale[600],
      },
      "cta-icon-color": {
        _light: lightThemeColors.greyscale[500],
        _dark: darkThemeColors.primary[500],
      },
      "cta-bg": {
        _light: lightThemeColors.brand.secondary,
        _dark: darkThemeColors.primary[500],
      },
      "cta-bg-hover": {
        _light: lightThemeColors.brand.secondaryLight,
        _dark: darkThemeColors.primary[600],
      },
      "cta-bg-focus": {
        _light: "#5C0099",
        _dark: darkThemeColors.primary[700],
      },
      "cta-bg-disabled": {
        _light: lightThemeColors.brand.secondary,
        _dark: darkThemeColors.primary[500],
      },
      "cta-color": {
        _light: lightThemeColors.greyscale[100],
        _dark: darkThemeColors.greyscale[900],
      },
      "body-text": {
        _light: lightThemeColors.greyscale[900],
        _dark: darkThemeColors.greyscale[0],
      },
      "logo-color": {
        _light: lightThemeColors.greyscale[0],
        _dark: darkThemeColors.greyscale[0],
      },
      "th-color": {
        _light: lightThemeColors.greyscale[500],
        _dark: darkThemeColors.greyscale[0],
      },
      "th-bg": {
        _light: lightThemeColors.greyscale[100],
        _dark: darkThemeColors.greyscale[700],
      },
      "status-online": {
        _light: darkThemeColors.primary[600], // da modificare con la variante per il light theme
        _dark: darkThemeColors.primary[600],
      },
      "status-offline": {
        _light: darkThemeColors.greyscale[600], // da modificare con i valori corretti
        _dark: darkThemeColors.greyscale[600], // da modificare con i valori corretti
      },
      "error-color": {
        _light: darkThemeColors.alert.error, // da modificare con i valori corretti
        _dark: darkThemeColors.alert.error, // da modificare con i valori corretti
      },
      "accent-color": {
        _light: lightThemeColors.brand.secondary, // da modificare con i valori corretti
        _dark: darkThemeColors.primary[500], // da modificare con i valori corretti
      },
      "badge-color": {
        _light: lightThemeColors.greyscale[200], // da modificare con i valori corretti
        _dark: darkThemeColors.greyscale[600], // da modificare con i valori corretti
      },
      "badge-bg": {
        _light: lightThemeColors.greyscale[900], // da modificare con i valori corretti
        _dark: darkThemeColors.greyscale[0], // da modificare con i valori corretti
      },
    },
  },
  colors: lightThemeColors,
  breakpoints,
  sizes,
  fonts,
  fontSizes,
  fontWeights,
  config: { useSystemColorMode: true, initialColorMode: "light", cssVarPrefix: "chakra" },
  components: {
    Button: buttonTheme,
  },
});

export default theme;
