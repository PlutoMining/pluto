"use client";
import {
  Box,
  Flex,
  HStack,
  Link,
  Slide,
  Stack,
  Text,
  useDisclosure,
  useToken,
} from "@chakra-ui/react";
import axios from "axios";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CrossIcon } from "../icons/CrossIcon";
import { DiscordLogo, GithubLogo } from "../icons/FooterIcons";
import { HamburgerIcon } from "../icons/HamburgerIcon";
import { Logo } from "../icons/Logo";
import { SettingsIcon } from "../icons/SettingsIcon/SettingsIcon";

export const NavBar = () => {
  const { isOpen, onClose, onToggle } = useDisclosure();
  const pathname = usePathname();
  const [version, setVersion] = useState("");

  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (slideRef.current && !slideRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const getVersion = async () => {
      const response = await axios.get("/api/app-version");
      setVersion(response.data.version);
    };

    getVersion();
  }, []);

  const links = [
    {
      key: "dashboard",
      href: "/",
      component: (pathname?: string | null) => (
        <Box
          color={pathname === "/" ? "header-selected" : "header-text"}
          fontWeight={pathname === "/" ? "700" : "500"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          textTransform={"uppercase"}
          _after={{
            display: pathname === "/" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: "header-selected-underline",
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Overview
        </Box>
      ),
    },
    {
      key: "monitoring",
      href: "/monitoring",
      component: (pathname?: string | null) => (
        <Box
          color={
            pathname === "/monitoring" || /^\/monitoring/.test(pathname || "")
              ? "header-selected"
              : "header-text"
          }
          fontWeight={
            pathname === "/monitoring" || /^\/monitoring/.test(pathname || "") ? "700" : "500"
          }
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          textTransform={"uppercase"}
          _after={{
            display:
              pathname === "/monitoring" || /^\/monitoring/.test(pathname || "") ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: "header-selected-underline",
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Monitoring
        </Box>
      ),
    },
    {
      key: "settings",
      href: "/device-settings",
      component: (pathname?: string | null) => (
        <Box
          color={pathname === "/device-settings" ? "header-selected" : "header-text"}
          fontWeight={pathname === "/device-settings" ? "700" : "500"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          textTransform={"uppercase"}
          _after={{
            display: pathname === "/device-settings" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: "header-selected-underline",
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Device settings
        </Box>
      ),
    },
    {
      key: "presets",
      href: "/presets",
      component: (pathname?: string | null) => (
        <Box
          color={pathname === "/presets" ? "header-selected" : "header-text"}
          fontWeight={pathname === "/presets" ? "700" : "500"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          textTransform={"uppercase"}
          _after={{
            display: pathname === "/presets" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: "header-selected-underline",
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Pool presets
        </Box>
      ),
    },
    {
      key: "devices",
      href: "/devices",
      component: (pathname?: string | null) => (
        <Box
          color={pathname === "/devices" ? "header-selected" : "header-text"}
          textTransform={"uppercase"}
          fontWeight={pathname === "/devices" ? "700" : "500"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display: pathname === "/devices" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: "header-selected-underline",
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Your devices
        </Box>
      ),
    },
  ];

  const [primaryColor] = useToken("colors", ["primary-color"]);

  return (
    <>
      <Box
        position={"sticky"}
        top={0}
        zIndex={isOpen ? "20" : "10"}
        bg={"header-bg"}
        borderBottomWidth={"1px"}
        borderBottomColor={"border-color"}
      >
        <Flex
          px={{ base: "1rem", tablet: "2rem" }}
          alignItems="center"
          maxW="container.desktop"
          margin={"0 auto"}
        >
          <Flex h={16} alignItems="center" gap={"1rem"} justifyContent="space-between" w={"100%"}>
            <Flex alignItems="center" gap={"1rem"} justify={"space-between"} w={"100%"}>
              <Flex marginRight={"auto"} gap={"0.5rem"} alignItems={"flex-end"}>
                <Link as={NextLink} key={`md-nav-link-logo`} href={"/"}>
                  <Logo />
                </Link>
                {version && (
                  <Text
                    fontWeight={400}
                    fontSize={"12px"}
                    opacity={0.8}
                    color={"body-text"}
                    marginBottom={"4px"}
                  >
                    V.{version}
                  </Text>
                )}
              </Flex>
              <HStack
                as="nav"
                spacing={4}
                display={{ base: "none", tabletL: "flex" }}
                p={"0.75rem"}
                borderRadius={"8px"}
                fontFamily={"heading"}
                fontSize={"14px"}
                fontWeight={"400"}
                lineHeight={"24px"}
                position={"absolute"}
                left={"50%"}
                transform={"translateX(-50%)"}
                height={"34px"}
              >
                {links.map((link) => (
                  <Link
                    as={NextLink}
                    key={`md-nav-link-${link.key}`}
                    whiteSpace="nowrap"
                    href={link.href}
                    _hover={{ textDecoration: "none" }}
                  >
                    {link.component(pathname)}
                  </Link>
                ))}
              </HStack>
              <Flex alignItems="center" gap={"1rem"} color={"#fff"}>
                <Link
                  as={NextLink}
                  key={"md-nav-link-settings"}
                  href={"/settings"}
                  whiteSpace={"nowrap"}
                  _hover={{ textDecoration: "none" }}
                >
                  <SettingsIcon color={"body-text"} />
                </Link>
              </Flex>

              <Box aria-label="Open Menu" display={{ tabletL: "none" }} cursor={"pointer"}>
                {isOpen ? (
                  <CrossIcon w={"32"} h={"32"} onClick={onToggle} />
                ) : (
                  <HamburgerIcon w={"32"} h={"32"} onClick={onToggle} />
                )}
              </Box>
            </Flex>
          </Flex>
        </Flex>
        {isOpen ? (
          <Slide
            direction="right"
            in={isOpen}
            style={{
              position: "fixed",
              top: "4rem",
              right: 0,
              width: "calc(50% + 160px)",
              maxWidth: "100vw",
            }}
          >
            <Box
              ref={slideRef}
              bgColor="bg-color"
              p={"2rem"}
              borderLeftWidth={"1px"}
              borderTopWidth={"1px"}
              borderColor={"border-color"}
              display={{ tabletL: "none" }}
              height={{
                base: "calc(100vh - 7.25rem)",
                tablet: "calc(100vh - 9.5rem)",
                tabletL: "calc(100vh - 8.5rem)",
              }}
            >
              <Flex flexDir={"column"} justify={"space-between"} height={"100%"}>
                <Stack alignItems={"start"} as="nav" spacing={"2rem"}>
                  {links.map((link) => (
                    <Link
                      onClick={() => {
                        onToggle();
                      }}
                      as={NextLink}
                      key={`sm-nav-link-${link.key}`}
                      href={link.href}
                      cursor={"pointer"}
                      _hover={{ textDecoration: "none" }}
                      fontWeight={500}
                      fontFamily={"body"}
                      textTransform={"uppercase"}
                    >
                      {link.component(pathname)}
                    </Link>
                  ))}
                </Stack>
                <Flex flexDir={"column"} gap={"1rem"}>
                  <Flex
                    gap={"1rem"}
                    justify={"flex-start"}
                    borderBottomWidth={"0.5px"}
                    borderBottomColor={"border-color"}
                    paddingBottom={"1rem"}
                  >
                    {/* <MetaLogo target="_blank" /> */}
                    <GithubLogo
                      url="https://github.com/PlutoMining/pluto"
                      target="_blank"
                      color={primaryColor}
                    />
                    <DiscordLogo
                      url="https://discord.gg/osmu"
                      target="_blank"
                      color={primaryColor}
                    />
                    {/* <RedditLogo target="_blank" /> */}
                  </Flex>
                  <Link
                    // as={NextLink}
                    fontFamily={"heading"}
                    fontSize={"xs"}
                    color={"footer-text"}
                    fontWeight={500}
                    textDecoration={"underline"}
                  >
                    Terms & Conditions
                  </Link>

                  <Text fontSize={"xs"} fontWeight={300} color={"footer-text"}>
                    © 2024 Pluto. All rights reserved. This open-source application software is
                    licensed under the Lorem Ipsum License.
                  </Text>
                </Flex>
              </Flex>
            </Box>
          </Slide>
        ) : null}
      </Box>
    </>
  );
};
