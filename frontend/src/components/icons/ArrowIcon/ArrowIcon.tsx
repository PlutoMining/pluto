import React from "react";

interface ArrowIconProps {
  color?: string;
}

export const ArrowIcon = ({ color = "currentColor" }: ArrowIconProps) => {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.75 10.5L11.25 6L6.75 1.5M1.5 10.5L6 6L1.5 1.5"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
