/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { Badge as ChakraBadge, useToken } from "@chakra-ui/react";

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
  // online colors
  const [onlineColor] = useToken("colors", ["badge-online-color"]);
  const [onlineBorder] = useToken("colors", ["badge-online-border"]);
  const [onlineBg] = useToken("colors", ["badge-online-bg"]);

  // offline colors
  const [offlineColor] = useToken("colors", ["badge-offline-color"]);
  const [offlineBorder] = useToken("colors", ["badge-offline-border"]);
  const [offlineBg] = useToken("colors", ["badge-offline-bg"]);

  const color = status === "online" ? onlineColor : offlineColor;
  const borderColor = status === "online" ? onlineBorder : offlineBorder;
  const bgColor = status === "online" ? onlineBg : offlineBg;
  return (
    <ChakraBadge
      fontFamily={"body"}
      fontWeight={"500"}
      bg={bgColor}
      color={color}
      fontSize={"13px"}
      lineHeight={lineHeight}
      borderWidth={"1px"}
      borderColor={borderColor}
      padding={"4px 8px"}
      textTransform={"uppercase"}
      alignContent={"center"}
      borderRadius={0}
    >
      {label ? label : status}
    </ChakraBadge>
  );
};
