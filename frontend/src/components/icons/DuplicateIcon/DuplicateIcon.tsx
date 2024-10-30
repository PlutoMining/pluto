import { useToken } from "@chakra-ui/react";
import React from "react";

interface DuplicateIconProps {
  color?: string;
  w?: string;
  h?: string;
}

export const DuplicateIcon = ({
  color = "cta-icon-color",
  w = "24",
  h = "24",
}: DuplicateIconProps) => {
  const [strokeColor] = useToken("colors", [color]);

  return (
    <svg width={w} height={h} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 6V3H15V12H12M3 6H12V15H3V6Z"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
