import { ReactElement } from "react";
import { Link as ChakraLink, Flex } from "@chakra-ui/react";
import React from "react";

interface LinkProps {
  label: string;
  href: string;
  leftIcon?: ReactElement;
  rightIcon?: ReactElement;
}

const Link: React.FC<LinkProps> = ({ label, href, leftIcon, rightIcon }) => {
  return (
    <ChakraLink href={href} fontFamily={"heading"} fontSize={"13px"} fontWeight={400}>
      <Flex alignItems={"center"} gap={"0.5rem"}>
        {leftIcon && leftIcon}
        {label}
      </Flex>
    </ChakraLink>
  );
};

export default Link;
