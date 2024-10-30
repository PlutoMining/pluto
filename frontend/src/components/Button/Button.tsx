import { MouseEventHandler, ReactElement, ReactNode } from "react";
import { Button as ChakraButton } from "@chakra-ui/react";
import { defineStyle, defineStyleConfig } from "@chakra-ui/react";
import React from "react";

const primaryBlack = defineStyle((styles) => {
  return {
    fontFamily: styles.theme.fonts.heading,
    background: styles.theme.colors.greyscale[700],
    color: styles.theme.colors.greyscale[100],
    borderRadius: "6px",
    // width: { base: "100%" },
    fontWeight: 400,
    padding: "6px 12px",
    fontSize: "13px",
    textAlign: "center",
    _hover: {
      bg: styles.theme.colors.greyscale[500],
    },
    _focus: {
      bg: styles.theme.colors.greyscale[900],
    },
    _disabled: {
      bg: styles.theme.colors.greyscale[700],
      opacity: 0.2,
    },
  };
});

const primary = defineStyle((styles) => {
  return {
    fontFamily: styles.theme.fonts.heading,
    background: "cta-bg",
    color: "cta-color",
    borderRadius: 0,
    fontWeight: 400,
    padding: "6px 12px",
    fontSize: "13px",
    textAlign: "center",
    _hover: {
      bg: "cta-bg-hover",
    },
    _focus: {
      bg: "cta-bg-focus",
    },
    _disabled: {
      bg: "cta-bg-disabled",
      opacity: 0.2,
      pointerEvents: "none",
    },
  };
});

const secondary = defineStyle((styles) => {
  return {
    fontFamily: styles.theme.fonts.heading,
    background: styles.theme.colors.greyscale[200],
    color: styles.theme.colors.greyscale[900],
    borderRadius: "6px",
    // width: { base: "100%" },
    fontWeight: 400,
    padding: "6px 12px",
    fontSize: "13px",
    textAlign: "center",
  };
});

const outlined = defineStyle(() => {
  return {
    background: "item-bg",
    color: "body-text",
    borderColor: "body-text",
    borderWidth: "1px",
    borderRadius: 0,
    fontWeight: 400,
    padding: "6px 12px",
    textAlign: "center",
    fontSize: "13px",

    _hover: {
      // bg: "#D2CED5",
      // borderColor: "#D2CED5",
      // color: styles.theme.colors.greyscale[500],
    },
    _focus: {
      // background: styles.theme.colors.greyscale[300],
      // color: styles.theme.colors.greyscale[500],
      // borderColor: styles.theme.colors.greyscale[300],
    },
    _disabled: {
      // background: styles.theme.colors.greyscale[0],
      // color: styles.theme.colors.greyscale[500],
      // borderColor: styles.theme.colors.greyscale[200],

      opacity: 0.5,
    },
  };
});

const text = defineStyle((styles) => {
  return {
    background: "none",
    color: styles.theme.semanticTokens.colors["body-text"],
    fontSize: "13px",
    lineHeight: "1.5rem",
    fontWeight: 400,
    fontFamily: styles.theme.fonts.heading,
    padding: "1rem",
    borderRadius: "6px",

    _hover: {
      bg: "#5C009940",
    },
    _focus: {
      bg: "#5C009966",
    },
    _disabled: {
      opacity: 0.3,
    },
  };
});

export const buttonTheme = defineStyleConfig({
  variants: { primaryBlack, primary, text, outlined, secondary },
});

interface ButtonProps {
  variant: "text" | "primaryBlack" | "primary" | "outlined" | "secondary";
  label?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset" | undefined;
  isLoading?: boolean;
  borderColor?: string;
  icon?: ReactElement;
  rightIcon?: ReactElement;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  label,
  onClick,
  disabled,
  type,
  isLoading,
  icon,
  rightIcon,
}) => {
  return (
    <ChakraButton
      leftIcon={icon}
      rightIcon={rightIcon}
      isLoading={isLoading}
      isDisabled={disabled || false}
      variant={variant}
      onClick={onClick}
      type={type}
      fontFamily={"heading"}
    >
      {label}
    </ChakraButton>
  );
};

export default Button;
