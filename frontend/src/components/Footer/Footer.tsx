import { Flex, Text } from "@chakra-ui/react";
import { BemindLogo } from "../icons/BemindLogo";
import { DiscordLogo, GitLabLogo, MetaLogo, RedditLogo } from "../icons/FooterIcons";

export const Footer = () => {
  return (
    <Flex
      alignItems={"center"}
      position={"sticky"}
      bottom={0}
      zIndex={"10"}
      bg={"brand.purple0"}
      fontWeight={400}
      color={"greyscale.200"}
      p={"1rem 0"}
    >
      <Flex
        margin={"0 auto"}
        justify={{ mobile: "flex-start", tablet: "space-between", desktop: "space-between" }}
        flexDir={{ mobile: "column", tablet: "row", desktop: "row" }}
        gap={"1rem"}
        w={"100%"}
        maxW="container.desktop"
        p={"0 2rem"}
      >
        <Flex
          display={{ base: "none", tablet: "unset" }}
          alignItems={{ mobile: "flex-start", tablet: "flex-start", desktop: "center" }}
          gap={{ mobile: "0.5rem", tablet: "0.5rem", desktop: "1rem" }}
          flexDir={{ mobile: "column", tablet: "column-reverse", desktop: "row" }}
        >
          <Flex
            alignItems={"center"}
            gap={"1rem"}
            justify={{ mobile: "space-between", tablet: "flex-start", desktop: "flex-start" }}
            w={{ mobile: "100%", tablet: "unset", desktop: "unset" }}
          >
            <Text fontFamily={"heading"} fontSize={"xs"} color={"greyscale.200"} fontWeight={500}>
              Terms & Conditions
            </Text>
            <Flex gap={"0.5rem"}>
              {/* <MetaLogo /> */}
              <GitLabLogo url="https://gitlab.com/bemindinteractive/umbrel-community-app-store" />
              {/* <DiscordLogo /> */}
              {/* <RedditLogo /> */}
            </Flex>
          </Flex>
          <Text fontSize={"xs"} fontWeight={300} color={"greyscale.200"}>
            © 2024 Pluto. All rights reserved. This open-source application software is licensed
            under the Lorem Ipsum License.
          </Text>
        </Flex>
        <Flex gap={"0.5rem"} align={"center"}>
          <Text fontSize={"xs"} fontWeight={300} color={"greyscale.200"}>
            Designed with love by
          </Text>
          <BemindLogo url="https://www.bemind.me/" />
        </Flex>
      </Flex>
    </Flex>
  );
};
