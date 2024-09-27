import React from "react";

interface WarningIconProps {
  color?: string;
  w?: string;
  h?: string;
}

export const WarningIcon = ({ color = "white", w = "24", h = "24" }: WarningIconProps) => {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15.49V15.5M12 9.5V12.5M11 3.5L3 17.5L4.5 19.5H19.5L21 17.5L13 3.5H11Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
