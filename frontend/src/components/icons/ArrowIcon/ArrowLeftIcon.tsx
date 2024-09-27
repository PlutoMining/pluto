import React from "react";

interface ArrowLeftIconProps {
  color: string;
}

export const ArrowLeftIcon = ({ color = "white" }: ArrowLeftIconProps) => {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9L15 9M3 9L7.5 4.5M3 9L7.5 13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
