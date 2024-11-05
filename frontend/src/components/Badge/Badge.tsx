import { Badge as ChakraBadge, Text, useToken } from "@chakra-ui/react";

export interface DeviceStatusBadgeProps {
  label?: string | number;
  color?: string;
  bg?: string;
  fontWeight?: string;
}

export const Badge: React.FC<DeviceStatusBadgeProps> = ({
  label,
  color = "body-text",
  bg = "dashboard-badge-bg",
  fontWeight = 500,
}) => {
  const [badgeColor] = useToken("colors", [bg]);
  const [textColor] = useToken("colors", [color]);

  return (
    <ChakraBadge
      bg={badgeColor}
      color={textColor}
      fontSize={"13px"}
      borderRadius={0}
      padding={"4px 8px"}
    >
      {label && (
        <Text
          fontWeight={fontWeight}
          textTransform={"uppercase"}
          fontFamily={"accent"}
          fontSize={"lg"}
        >
          {label}
        </Text>
      )}
    </ChakraBadge>
  );
};
