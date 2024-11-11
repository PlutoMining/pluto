import { buttonTheme } from "@/components/Button/Button";
import { extendTheme } from "@chakra-ui/react";
import { fonts, fontSizes, fontWeights } from "./typography";
import { colors } from "./colors";

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
        _light: colors.greyscale[0],
        _dark: colors.greyscale[900],
      },
      "header-bg": {
        _light: colors.greyscale[0],
        _dark: colors.greyscale[900],
      },
      "header-text": {
        _light: colors.greyscale[300],
        _dark: colors.greyscale[200],
      },
      "header-text-disabled": {
        _light: colors.greyscale[200],
        _dark: colors.greyscale[600],
      },
      "header-selected": {
        _light: colors.greyscale[900],
        _dark: colors.primary[500],
      },
      "header-selected-underline": {
        _light: colors.primary[600],
        _dark: colors.greyscale[500],
      },
      "footer-bg": {
        _light: colors.greyscale[0],
        _dark: colors.greyscale[900],
      },
      "border-color": {
        _light: colors.greyscale[200],
        _dark: colors.greyscale[500],
      },
      "item-bg": {
        _light: colors.greyscale[0],
        _dark: colors.greyscale[900],
      },
      // Input
      "input-bg": {
        _light: colors.greyscale[50],
        _dark: colors.greyscale[600],
      },
      "input-right-bg": {
        _light: colors.greyscale[50],
        _dark: colors.greyscale[600],
      },
      "input-label-color": {
        _light: colors.greyscale[300],
        _dark: colors.greyscale[300],
      },
      "input-placeholder-color": {
        _light: colors.greyscale[300],
        _dark: colors.greyscale[200],
      },
      "input-disabled-color": {
        _light: colors.greyscale[200],
        _dark: colors.greyscale[500],
      },
      "input-disabled-bg": {
        _light: colors.greyscale[100],
        _dark: colors.greyscale[700],
      },
      "input-disabled-hint-color": {
        _light: colors.greyscale[600],
        _dark: colors.greyscale[300],
      },
      "input-accent-color": {
        _light: colors.primary[800],
        _dark: colors.primary[500],
      },
      "input-border-color": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[300],
      },
      "cta-icon-color": {
        _light: colors.greyscale[800],
        _dark: colors.primary[500],
      },
      "cta-bg": {
        _light: colors.primary[600],
        _dark: colors.primary[500],
      },
      "cta-primary-icon-color": {
        _light: colors.greyscale[900],
        _dark: colors.greyscale[900],
      },
      "cta-bg-hover": {
        _light: colors.primary[700],
        _dark: colors.primary[600],
      },
      "cta-bg-focus": {
        _light: colors.primary[800],
        _dark: colors.primary[800],
      },
      "cta-bg-disabled": {
        _light: colors.greyscale[100],
        _dark: colors.greyscale[700],
      },
      "cta-color-disabled": {
        _light: colors.greyscale[200],
        _dark: colors.greyscale[500],
      },
      "cta-color": {
        _light: colors.greyscale[800],
        _dark: colors.greyscale[900],
      },
      "cta-outlined-focus": {
        _light: colors.greyscale[800],
        _dark: colors.greyscale[200],
      },
      "body-text": {
        _light: colors.greyscale[900],
        _dark: colors.greyscale[0],
      },
      "cta-outlined-hover": {
        _light: "rgba(0, 0, 0, 0.15)",
        _dark: "rgba(255, 255, 255, 0.15)",
      },
      "cta-outlined-disabled": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[500],
      },
      "cta-text-hover": {
        _light: colors.greyscale[900],
        _dark: colors.greyscale[100],
      },
      "cta-text-focus": {
        _light: colors.greyscale[700],
        _dark: colors.greyscale[300],
      },
      "cta-text-disabled": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[500],
      },
      "logo-color": {
        _light: colors.greyscale[800],
        _dark: colors.greyscale[0],
      },
      "device-th-color": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[300],
      },
      "th-color": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[0],
      },
      "th-bg": {
        _light: colors.greyscale[100],
        _dark: colors.greyscale[600],
      },
      "td-bg": {
        _light: colors.greyscale[0],
        _dark: colors.greyscale[700],
      },
      // device status badge colors
      "badge-online-border": {
        _light: colors.primary[600],
        _dark: colors.primary[600],
      },
      "badge-online-color": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[0],
      },
      "badge-online-bg": {
        _light: "rgba(0, 203, 184, 0.05)",
        _dark: "rgba(0, 203, 184, 0.5)",
      },
      "badge-offline-border": {
        _light: colors.greyscale[300],
        _dark: colors.greyscale[300],
      },
      "badge-offline-color": {
        _light: colors.greyscale[300],
        _dark: colors.greyscale[300],
      },
      "badge-offline-bg": {
        _light: "rgba(162, 166, 165, 0.05)",
        _dark: "rgba(162, 166, 165, 0.05)",
      },
      "error-color": {
        _light: colors.alert.error,
        _dark: colors.alert.error,
      },
      "warning-color": {
        _light: colors.alert.warning,
        _dark: colors.alert.warning,
      },
      "success-color": {
        _light: colors.alert.success,
        _dark: colors.alert.success,
      },
      "accent-color": {
        _light: colors.primary[600],
        _dark: colors.primary[500],
      },
      "badge-color": {
        _light: colors.greyscale[900],
        _dark: colors.greyscale[0],
      },
      "badge-bg": {
        _light: colors.primary[200],
        _dark: colors.greyscale[500],
      },
      "badge-border": {
        _light: colors.greyscale[200],
        _dark: colors.greyscale[500],
      },
      "badge-ip-color": {
        _light: colors.greyscale[500],
        _dark: colors.greyscale[200],
      },
      "dashboard-title": {
        _light: colors.greyscale[900],
        _dark: colors.greyscale[200],
      },
      "dashboard-section-bg": {
        _light: colors.greyscale[100],
        _dark: colors.greyscale[900],
      },
      "dashboard-border-color": {
        _light: colors.greyscale[100],
        _dark: colors.greyscale[500],
      },
      "dashboard-section-badge-bg": {
        _light: colors.greyscale[0],
        _dark: colors.greyscale[750],
      },
      "dashboard-badge-bg": {
        _light: colors.greyscale[100],
        _dark: "#CBCBCC66",
      },
      "primary-color": {
        _light: colors.primary[600],
        _dark: colors.primary[500],
      },
      "footer-terms-and-conditions": {
        _light: colors.greyscale[900],
        _dark: colors.primary[100],
      },
      "footer-text": {
        _light: colors.greyscale[500],
        _dark: colors.primary[100],
      },

      // device-settings
      "ds-h-table": {
        _light: colors.greyscale[50],
        _dark: colors.greyscale[550],
      },
      "ds-h-acc": {
        _light: colors.greyscale[100],
        _dark: colors.greyscale[800],
      },
      "ds-body-acc": {
        _light: colors.greyscale[0],
        _dark: colors.greyscale[900],
      },
    },
  },
  colors: [colors, colors],
  breakpoints,
  sizes,
  fonts,
  fontSizes,
  fontWeights,
  config: { useSystemColorMode: true, initialColorMode: "dark", cssVarPrefix: "chakra" },
  components: {
    Button: buttonTheme,
  },
});

export default theme;
