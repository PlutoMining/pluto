import { Flex, Text, useTheme, useToken } from "@chakra-ui/react";
import { Badge as ChakraBadge } from "@chakra-ui/react";
import Link from "../Link/Link";

export interface DeviceStatusBadgeProps {
  mac: string;
  hostname: string;
  ip: string;
  tracing: boolean;
}

export const HostnameBadge: React.FC<DeviceStatusBadgeProps> = ({ mac, hostname, ip, tracing }) => {
  const [badgeBg] = useToken("colors", ["badge-bg"]);
  const [badgeColor] = useToken("colors", ["badge-color"]);
  const [badgeIpColor] = useToken("colors", ["badge-ip-color"]);
  return (
    <ChakraBadge
      key={mac}
      backgroundColor={badgeBg}
      fontSize={"xs"}
      borderRadius={0}
      padding={"4px 6px"}
      fontFamily={"body"}
    >
      <Flex alignItems={"center"} gap={"0.25rem"} p={"5px 8px"} height={"21.5px"}>
        <Text fontWeight={500} textTransform={"capitalize"} color={badgeColor}>
          {hostname}
        </Text>
        <Text fontWeight={500} color={"primary-color"}>
          {" - "}
        </Text>
        <Link
          href={ip}
          label={ip}
          fontFamily="accent"
          fontWeight={400}
          color={badgeIpColor}
          textDecoration="underline"
          isDisabled={tracing ? false : true}
        />
      </Flex>
    </ChakraBadge>
  );
};
