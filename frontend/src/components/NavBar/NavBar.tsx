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
  useTheme,
} from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Alert from "../Alert/Alert";
import { AlertInterface } from "../Alert/interfaces";
import { Logo } from "../icons/Logo";
import { HamburgerIcon } from "../icons/HamburgerIcon";
import { CrossIcon } from "../icons/CrossIcon";
import { DiscordLogo, GitLabLogo, MetaLogo, RedditLogo } from "../icons/FooterIcons";

export const NavBar = () => {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();
  const pathname = usePathname();
  const theme = useTheme();

  const [alert, setAlert] = useState<AlertInterface>();
  const { isOpen: isOpenAlert, onOpen: onOpenAlert, onClose: onCloseAlert } = useDisclosure();

  const closeAlert = () => {
    setAlert(undefined);
    onCloseAlert();
  };

  const links = [
    {
      key: "dashboard",
      href: "/",
      component: (pathname?: string | null) => (
        <Box
          color={"#fff"}
          fontWeight={pathname === "/" ? "700" : "400"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display: pathname === "/" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: theme.colors.greyscale[0],
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
          color={"#fff"}
          fontWeight={
            pathname === "/monitoring" || /^\/monitoring/.test(pathname || "") ? "700" : "400"
          }
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display:
              pathname === "/monitoring" || /^\/monitoring/.test(pathname || "") ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: theme.colors.greyscale[0],
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
      href: "/settings",
      component: (pathname?: string | null) => (
        <Box
          color={"#fff"}
          fontWeight={pathname === "/settings" ? "700" : "400"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display: pathname === "/settings" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: theme.colors.greyscale[0],
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
          color={"#fff"}
          fontWeight={pathname === "/presets" ? "700" : "400"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display: pathname === "/presets" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: theme.colors.greyscale[0],
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
          color={"#fff"}
          fontWeight={pathname === "/devices" ? "700" : "400"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display: pathname === "/devices" ? "block" : "none",
            content: '""',
            width: "32px",
            height: "2px",
            borderRadius: "3px",
            backgroundColor: theme.colors.greyscale[0],
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

  return (
    <>
      <Box position={"sticky"} top={0} zIndex={isOpen ? "20" : "10"} bg={"brand.purple0"}>
        <Flex px={"2rem"} alignItems="center" maxW="container.desktop" margin={"0 auto"}>
          <Flex h={16} alignItems="center" gap={"1rem"} justifyContent="space-between" w={"100%"}>
            <Flex alignItems="center" gap={"1rem"} justify={"space-between"} w={"100%"}>
              <Box marginRight={"auto"}>
                <Link key={`md-nav-link-logo`} href={"/"}>
                  <Logo />
                </Link>
              </Box>
              <HStack
                as="nav"
                spacing={4}
                display={{ mobile: "none", tablet: "flex" }}
                backgroundColor={"rgba(255, 255, 255, 0.10)"}
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
                    key={`md-nav-link-${link.key}`}
                    href={link.href}
                    whiteSpace={"nowrap"}
                    _hover={{ textDecoration: "none" }}
                  >
                    {link.component(pathname)}
                  </Link>
                ))}
              </HStack>
              <Flex alignItems="center" gap={"1rem"} color={"#fff"}>
                {/* <Text fontFamily={"heading"} fontSize={"14px"}>
                  Notification
                </Text>
                <Text fontFamily={"heading"} fontSize={"14px"}>
                  Profile
                </Text> */}
              </Flex>

              <Box aria-label="Open Menu" display={{ tablet: "none" }} cursor={"pointer"}>
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
              bgColor="rgb(71, 25, 107)"
              borderTopLeftRadius="1rem"
              borderBottomLeftRadius="1rem"
              p={"2rem"}
              display={{ tablet: "none" }}
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
                      key={`sm-nav-link-${link.key}`}
                      href={link.href}
                      cursor={"pointer"}
                      _hover={{ textDecoration: "none" }}
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
                    borderBottomColor={"greyscale.200"}
                    paddingBottom={"1rem"}
                  >
                    {/* <MetaLogo /> */}
                    <GitLabLogo url="https://gitlab.com/bemindinteractive/umbrel-community-app-store" />
                    {/* <DiscordLogo /> */}
                    {/* <RedditLogo /> */}
                  </Flex>
                  <Link
                    fontFamily={"heading"}
                    fontSize={"xs"}
                    color={"greyscale.200"}
                    fontWeight={500}
                    textDecoration={"underline"}
                  >
                    Terms & Conditions
                  </Link>

                  <Text fontSize={"xs"} fontWeight={300} color={"greyscale.200"}>
                    © 2024 Pluto. All rights reserved. This open-source application software is
                    licensed under the Lorem Ipsum License.
                  </Text>
                </Flex>
              </Flex>
            </Box>
          </Slide>
        ) : null}
      </Box>
      {alert && (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      )}
    </>
  );
};
