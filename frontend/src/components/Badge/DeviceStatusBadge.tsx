import { useToken } from "@chakra-ui/react";
import { Badge as ChakraBadge } from "@chakra-ui/react";

export interface DeviceStatusBadgeProps {
  status?: "online" | "offline";
  label?: string;
  lineHeight?: string;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  status = "online",
  label,
  lineHeight = "20px",
}) => {
  const [onlineColor] = useToken("colors", ["status-online"]);
  const [offlineColor] = useToken("colors", ["status-offline"]);

  const color = status === "online" ? onlineColor : offlineColor;

  return (
    <ChakraBadge
      bg={"transparent"}
      color={color}
      fontSize={"13px"}
      lineHeight={lineHeight}
      borderWidth={"1px"}
      borderColor={color}
      padding={"0 8px"}
      textTransform={"uppercase"}
      alignContent={"center"}
    >
      {label ? label : status}
    </ChakraBadge>
  );
};
