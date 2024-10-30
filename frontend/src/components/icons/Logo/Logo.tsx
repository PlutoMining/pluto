import { Flex, useToken } from "@chakra-ui/react";
import { PlutoLogo } from "../PlutoLogo";

interface LogoProps {}

export const Logo = ({}: LogoProps) => {
  const [color] = useToken("colors", ["logo-color"]);

  return (
    <Flex gap={"0.5rem"} alignItems={"center"}>
      <PlutoLogo color={color} />
    </Flex>
  );
};
