/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

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
      {...(as ? {} : { as })}
      {...(isDisabled && href !== undefined ? {} : { href })}
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
