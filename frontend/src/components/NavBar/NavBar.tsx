"use client";
import { CloseIcon, HamburgerIcon } from "@chakra-ui/icons";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Stack,
  StackDivider,
  useDisclosure,
  useTheme,
} from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Alert from "../Alert/Alert";
import { AlertInterface } from "../Alert/interfaces";
import { Logo } from "../icons/Logo";

export const NavBar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
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
          fontWeight={pathname === "/monitoring" ? "700" : "400"}
          fontFamily={"heading"}
          fontSize={"sm"}
          position={"relative"}
          _after={{
            display: pathname === "/monitoring" ? "block" : "none",
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
      <Box position={"sticky"} top={0} zIndex={"10"} bg={"brand.purple0"}>
        <Flex px={"2rem"} alignItems="center" maxW="container.2xl" margin={"0 auto"}>
          <Flex h={16} alignItems="center" gap={"1rem"} justifyContent="space-between" w={"100%"}>
            <Flex alignItems="center" gap={"1rem"} justify={"space-between"} w={"100%"}>
              <IconButton
                size="md"
                icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                aria-label="Open Menu"
                display={{ md: "none" }}
                onClick={isOpen ? onClose : onOpen}
              />
              <Box marginRight={"auto"}>
                <Link key={`md-nav-link-logo`} href={"/"}>
                  <Logo />
                </Link>
              </Box>
              <HStack
                as="nav"
                spacing={4}
                display={{ base: "none", md: "flex" }}
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
              >
                {links.map((link) => (
                  <Link key={`md-nav-link-${link.key}`} href={link.href}>
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
            </Flex>
          </Flex>
        </Flex>
        {isOpen ? (
          <Box p={"2rem"} display={{ md: "none" }}>
            <Stack divider={<StackDivider />} alignItems={"start"} as="nav" spacing={"2rem"}>
              {links.map((link) => (
                <Link key={`sm-nav-link-${link.key}`} href={link.href}>
                  {link.component(pathname)}
                </Link>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
      {alert && (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      )}
    </>
  );
};
