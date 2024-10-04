import { ReactElement } from "react";
import { Link as ChakraLink, Flex, textDecoration, useTheme } from "@chakra-ui/react";
import React from "react";

interface LinkProps {
  label: string;
  href: string;
  leftIcon?: ReactElement;
  rightIcon?: ReactElement;
  fontWeight?: string | number;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  textDecoration?: string;
  isDisabled?: boolean;
}

const Link: React.FC<LinkProps> = ({
  label,
  href,
  leftIcon,
  rightIcon,
  fontWeight = 400,
  fontFamily = "heading",
  fontSize = "13px",
  color,
  textDecoration,
  isDisabled,
}) => {
  const theme = useTheme();
  return (
    <ChakraLink
      href={isDisabled ? undefined : href}
      fontFamily={fontFamily}
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={isDisabled ? theme.colors.greyscale[900] : color}
      textDecoration={textDecoration}
      pointerEvents={isDisabled ? "none" : "auto"} // Disables the pointer events
      cursor={isDisabled ? "not-allowed" : "pointer"} // Change cursor to 'not-allowed'
      _hover={{ textDecoration: isDisabled ? "none" : "underline" }} // Disable hover effect when disabled
    >
      <Flex alignItems={"center"} gap={"0.5rem"}>
        {leftIcon && leftIcon}
        {label}
      </Flex>
    </ChakraLink>
  );
};

export default Link;
