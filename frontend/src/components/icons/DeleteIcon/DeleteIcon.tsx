import React, { MouseEventHandler } from "react";

interface DeleteIconProps {
  color?: string;
  w?: string;
  h?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

export const DeleteIcon = ({
  color = "currentColor",
  w = "24",
  h = "24",
  onClick,
}: DeleteIconProps) => {
  return (
    <svg
      onClick={onClick}
      width={w}
      height={h}
      viewBox="0 0 24 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 6.29688V20.2969H6V6.29688M18 6.29688H20M18 6.29688H16M6 6.29688H4M6 6.29688H8M10 10.2969V16.2969M14 10.2969V16.2969M16 6.29688V4.29687C16 3.74459 15.5523 3.29688 15 3.29688H9C8.44772 3.29688 8 3.74459 8 4.29688V6.29688M16 6.29688H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
