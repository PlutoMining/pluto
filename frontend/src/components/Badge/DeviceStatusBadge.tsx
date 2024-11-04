import { useToken } from "@chakra-ui/react";
import { Badge as ChakraBadge } from "@chakra-ui/react";

export interface DeviceStatusBadgeProps {
  status?: "online" | "offline";
  label?: string;
  lineHeight?: string;
  invert?: boolean;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  status = "online",
  label,
  lineHeight = "20px",
  invert = false,
}) => {
  const [onlineColor] = useToken("colors", ["status-online"]);
  const [offlineColor] = useToken("colors", ["status-offline"]);

  const color = status === "online" ? onlineColor : offlineColor;
  const bgColor = useToken("colors", ["bg-color"]);

  return (
    <ChakraBadge
      fontFamily={"body"}
      fontWeight={"500"}
      bg={invert ? color : "transparent"}
      color={invert ? bgColor : color}
      fontSize={"13px"}
      lineHeight={lineHeight}
      borderWidth={"1px"}
      borderColor={color}
      padding={"4px 8px"}
      textTransform={"uppercase"}
      alignContent={"center"}
      borderRadius={0}
    >
      {label ? label : status}
    </ChakraBadge>
  );
};
