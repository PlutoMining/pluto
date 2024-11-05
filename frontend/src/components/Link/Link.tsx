import { As, Link as ChakraLink, Flex, useToken } from "@chakra-ui/react";
import React, { ReactElement } from "react";

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
  isExternal?: boolean;
  as?: As;
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
  isExternal,
  as,
}) => {
  const [textColor] = useToken("colors", ["body-text"]);
  return (
    <ChakraLink
      as={as}
      href={isDisabled ? undefined : href}
      fontFamily={fontFamily}
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={isDisabled ? textColor : color}
      textDecoration={textDecoration}
      pointerEvents={isDisabled ? "none" : "auto"} // Disables the pointer events
      cursor={isDisabled ? "not-allowed" : "pointer"} // Change cursor to 'not-allowed'
      _hover={{ textDecoration: isDisabled ? "none" : "underline" }} // Disable hover effect when disabled
      isExternal={isExternal}
    >
      <Flex alignItems={"center"} gap={"0.25rem"}>
        {leftIcon && leftIcon}
        {label}
        {rightIcon && rightIcon}
      </Flex>
    </ChakraLink>
  );
};

export default Link;
