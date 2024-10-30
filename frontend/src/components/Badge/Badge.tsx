import { Flex, Text, useTheme } from "@chakra-ui/react";
import { Badge as ChakraBadge } from "@chakra-ui/react";

export interface DeviceStatusBadgeProps {
  title?: string | number;
  label?: string | number;
  color?: string;
  bg?: string;
  fontWeight?: string;
}

export const Badge: React.FC<DeviceStatusBadgeProps> = ({
  title,
  label,
  color,
  bg,
  fontWeight = 400,
}) => {
  const theme = useTheme();

  return (
    <ChakraBadge
      bg={bg || color}
      color={bg ? color : theme.colors.greyscale[500]}
      fontSize={"13px"}
      borderRadius={0}
      padding={"4px 6px"}
    >
      <Flex gap={"0.25rem"} alignItems={"center"} wrap={"wrap"}>
        {title && (
          <Text fontWeight={500} textTransform={"capitalize"}>
            {title}
          </Text>
        )}
        {label && (
          <Text fontWeight={fontWeight} textTransform={"none"}>
            {label}
          </Text>
        )}
      </Flex>
    </ChakraBadge>
  );
};
