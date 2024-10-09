import React, { MouseEventHandler } from "react";

interface HamburgerIconProps {
  color?: string;
  w?: string;
  h?: string;
  onClick: MouseEventHandler<SVGSVGElement>;
}

export const HamburgerIcon = ({
  color = "white",
  w = "24",
  h = "24",
  onClick,
}: HamburgerIconProps) => {
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path
        d="M6.66663 8H25.3333M6.66663 16H25.3333M6.66663 24H25.3333"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
