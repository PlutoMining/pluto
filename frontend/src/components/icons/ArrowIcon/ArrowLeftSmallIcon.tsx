import React from "react";

interface ArrowLeftSmallIconProps {
  color: string;
}

export const ArrowLeftSmallIcon = ({ color = "white" }: ArrowLeftSmallIconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 15L16 12M16 12L13 9M16 12H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
