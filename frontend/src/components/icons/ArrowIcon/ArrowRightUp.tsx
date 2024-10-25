import React from "react";

interface ArrowRightUpProps {
  color: string;
}

export const ArrowRightUpIcon = ({ color = "white" }: ArrowRightUpProps) => {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.989 3L3 15M14.989 3H7.5M14.989 3L15 10.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
