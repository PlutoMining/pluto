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
    <svg width={w} height={h} viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 6.29688V3.29688H21V14.2969H18M4 10.2969H15V21.2969H4V10.2969Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
