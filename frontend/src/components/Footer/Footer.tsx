import { Flex, Text } from "@chakra-ui/react";
import { BemindLogo } from "../icons/BemindLogo";
import { DiscordLogo, GitLabLogo, MetaLogo, RedditLogo } from "../icons/FooterIcons";

export const Footer = () => {
  return (
    <Flex
      alignItems={"center"}
      position={"sticky"}
      bottom={0}
      height={"3.5rem"}
      zIndex={"10"}
      bg={"brand.purple0"}
      fontWeight={400}
      color={"greyscale.200"}
    >
      <Flex
        margin={"0 auto"}
        justify={"space-between"}
        gap={"1rem"}
        w={"100%"}
        maxW="container.2xl"
        p={"0 2rem"}
      >
        <Flex alignItems={"center"} gap={"1rem"}>
          <Text fontFamily={"heading"} fontSize={"xs"} color={"greyscale.200"} fontWeight={500}>
            Terms & Conditions
          </Text>
          <Flex gap={"0.5rem"}>
            <MetaLogo />
            <GitLabLogo />
            <DiscordLogo />
            <RedditLogo />
          </Flex>
        </Flex>
        <Text fontSize={"xs"} fontWeight={300} color={"greyscale.200"}>
          © 2024 Pluto. All rights reserved. This open-source application software is licensed under
          the Lorem Ipsum License.
        </Text>
        <Flex gap={"0.5rem"} align={"center"}>
          <Text fontSize={"xs"} fontWeight={300} color={"greyscale.200"}>
            Designed with love by
          </Text>
          <BemindLogo />
        </Flex>
      </Flex>
    </Flex>
  );
};
