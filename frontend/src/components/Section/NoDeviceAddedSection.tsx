/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Link as ChakraLink, Text, VStack } from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";

interface NoDeviceAddedSectionProps {}

export const NoDeviceAddedSection: React.FC<NoDeviceAddedSectionProps> = ({}) => {
  return (
    <VStack>
      <Text>Start using Pluto adding your first device</Text>
      <ChakraLink
        as={NextLink}
        key={"add-devices"}
        href={"/devices"}
        textTransform={"uppercase"}
        background={"cta-bg"}
        color={"cta-color"}
        fontWeight={500}
        height={"40px"}
        padding={"6px 12px"}
        fontSize={"13px"}
        lineHeight={"15.17px"}
        textAlign={"center"}
        display={"flex"}
        alignItems={"center"}
        justifyContent={"center"}
        _hover={{ textDecoration: "none", bg: "cta-bg-hover" }}
        _focus={{
          bg: "cta-bg-focus",
        }}
        _disabled={{
          bg: "cta-bg-disabled",
          color: "cta-color-disabled",
          borderWidth: "1px",
          borderColor: "cta-color-disabled",
          pointerEvents: "none",
        }}
      >
        {'Go to "Your Devices"'}
      </ChakraLink>
    </VStack>
  );
};
