import React from "react";

interface ErrorIconProps {
  color?: string;
  w?: string;
  h?: string;
}

export const ErrorIcon = ({ color = "white", w = "24", h = "24" }: ErrorIconProps) => {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15.99V16M12 8V13M11 3L3 11L3 13L11 21H13L21 13V11L13 3L11 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
