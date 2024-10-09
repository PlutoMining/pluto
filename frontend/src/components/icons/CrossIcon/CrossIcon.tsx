import React, { MouseEventHandler } from "react";

interface CrossIconProps {
  color?: string;
  w?: string;
  h?: string;
  onClick: MouseEventHandler<SVGSVGElement>;
}

export const CrossIcon = ({ color = "white", w = "24", h = "24", onClick }: CrossIconProps) => {
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
        d="M10.6665 10.6667L15.9999 16M21.3332 21.3333L15.9999 16M15.9999 16L21.3332 10.6667M15.9999 16L10.6665 21.3333"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
