import { MouseEventHandler, ReactElement } from "react";
import { Button as ChakraButton } from "@chakra-ui/react";
import { defineStyle, defineStyleConfig } from "@chakra-ui/react";
import React from "react";

const primary = defineStyle(() => {
  return {
    fontFamily: "Azaret_Mono",
    background: "cta-bg",
    color: "cta-color",
    borderRadius: 0,
    fontWeight: 500,
    padding: "6px 12px",
    fontSize: "13px",
    lineHeight: "15.17px",
    textAlign: "center",
    textTransform: "uppercase",
    _hover: {
      bg: "cta-bg-hover",
    },
    _focus: {
      bg: "cta-bg-focus",
    },
    _disabled: {
      bg: "cta-bg-disabled",
      color: "cta-color-disabled",
      borderWidth: "1px",
      borderColor: "cta-color-disabled",
      pointerEvents: "none",
    },
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
      bg: "cta-outlined-hover",
    },
    _focus: {
      color: "cta-outlined-focus",
      borderColor: "cta-outlined-focus",
    },
    _disabled: {
      color: "cta-outlined-disabled",
      borderColor: "cta-outlined-disabled",
    },
  };
});

const text = defineStyle(() => {
  return {
    background: "none",
    color: "body-text",
    fontSize: "13px",
    lineHeight: "1.5rem",
    fontWeight: 400,
    padding: 0,
    iconColor: "cta-bg",
    _hover: {
      color: "cta-text-hover",
      iconColor: "cta-bg-hover",
    },
    _focus: {
      color: "cta-text-focus",
      iconColor: "cta-bg-focus",
    },
    _disabled: {
      color: "cta-text-disabled",
      iconColor: "cta-color-disabled",

      _hover: {
        color: "cta-text-disabled",
        iconColor: "cta-color-disabled",
      },
    },
  };
});

export const buttonTheme = defineStyleConfig({
  variants: { primary, text, outlined },
});

interface ButtonProps {
  variant: "text" | "primary" | "outlined";
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
      fontFamily={"body"}
      textTransform={"uppercase"}
      leftIcon={icon}
      rightIcon={rightIcon}
      isLoading={isLoading}
      isDisabled={disabled || false}
      variant={variant}
      onClick={onClick}
      type={type}
    >
      {label}
    </ChakraButton>
  );
};

export default Button;
