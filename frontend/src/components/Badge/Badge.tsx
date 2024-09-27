import { Flex, Text, useTheme } from "@chakra-ui/react";
import { Badge as ChakraBadge } from "@chakra-ui/react";

export interface DeviceStatusBadgeProps {
  title?: string;
  label?: string;
  color?: string;
  bg?: string;
}

export const Badge: React.FC<DeviceStatusBadgeProps> = ({ title, label, color, bg }) => {
  const theme = useTheme();

  return (
    <ChakraBadge
      bg={bg || color}
      color={bg ? color : theme.colors.greyscale[500]}
      fontSize={"13px"}
      borderRadius={"6px"}
      padding={"4px 6px"}
    >
      <Flex gap={"0.25rem"} alignItems={"center"}>
        {title && (
          <Text fontWeight={500} textTransform={"capitalize"}>
            {title}
          </Text>
        )}
        {label && (
          <Text fontWeight={400} textTransform={"none"}>
            {label}
          </Text>
        )}
      </Flex>
    </ChakraBadge>
  );
};
