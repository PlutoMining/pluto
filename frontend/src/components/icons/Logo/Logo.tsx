import { Flex, Heading } from "@chakra-ui/react";
import { PlutoLogo } from "../PlutoLogo";

interface LogoProps { }

export const Logo = ({ }: LogoProps) => {
  return (
    <Flex gap={'0.5rem'} alignItems={'center'}>
      <PlutoLogo />
    </Flex>
  );
};
