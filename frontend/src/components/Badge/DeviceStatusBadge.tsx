import { useTheme } from "@chakra-ui/react";
import { Badge as ChakraBadge } from "@chakra-ui/react";

export interface DeviceStatusBadgeProps {
  status?: "online" | "offline";
  label?: string;
  height?: string;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  status = "online",
  label,
  height = "20px",
}) => {
  const theme = useTheme();

  const bg = status === "online" ? theme.colors.generic.blue : theme.colors.greyscale[200];
  const color = status === "online" ? theme.colors.generic.blueDark : theme.colors.greyscale[600];

  return (
    <ChakraBadge
      bg={bg}
      color={color}
      fontSize={"13px"}
      lineHeight={"15.73px"}
      borderRadius={"50px"}
      padding={"0 8px"}
      textTransform={"capitalize"}
      height={height}
      alignContent={"center"}
    >
      {label ? label : status}
    </ChakraBadge>
  );
};
