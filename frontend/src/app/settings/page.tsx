"use client";
import { Box, Container, Flex, Heading, useColorMode, VStack } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Select } from "@/components/Select";

const SettingsPage: React.FC = () => {
  const { colorMode, setColorMode } = useColorMode();
  const [selectedColorMode, setSelectedColorMode] = useState<"light" | "dark">(colorMode);

  const colorModes = [
    {
      value: "dark",
      label: "Dark Theme",
    },
    {
      value: "light",
      label: "Light Theme",
    },
  ];

  useEffect(() => {
    if (selectedColorMode && selectedColorMode !== colorMode) {
      setColorMode(selectedColorMode);
    }
  }, [selectedColorMode, setColorMode, colorMode]);

  const handleChangeOnColorMode = (val: string) => {
    setSelectedColorMode(val as "light" | "dark");
  };

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <Box p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1.5rem" }}>
        <Flex as="form" flexDir={"column"} gap={"2rem"}>
          <Heading fontSize={"4xl"} fontWeight={"700"} textTransform={"uppercase"}>
            Settings
          </Heading>
          <VStack spacing={"1.5rem"} align="stretch" padding={"0 10rem"}>
            <Heading
              fontWeight={500}
              fontSize={"lg"}
              color={"text-color"}
              textTransform={"uppercase"}
            >
              System settings
            </Heading>
            <Select
              id={"color-mode"}
              label="Theme"
              name="theme"
              onChange={(e) => handleChangeOnColorMode(e.target.value)}
              defaultValue={selectedColorMode}
              optionValues={colorModes}
            />
          </VStack>
        </Flex>
      </Box>
    </Container>
  );
};

export default SettingsPage;
