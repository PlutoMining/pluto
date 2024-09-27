import React from "react";

interface DeleteIconProps {
  color?: string;
  w?: string;
  h?: string;
}

export const DeleteIcon = ({ color = "white", w = "24", h = "24" }: DeleteIconProps) => {
  return (
    <svg width={w} height={h} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 4.5V15H4.5V4.5M13.5 4.5H15M13.5 4.5H12M4.5 4.5H3M4.5 4.5H6M7.5 7.5V12M10.5 7.5V12M12 4.5V3C12 2.58579 11.6642 2.25 11.25 2.25H6.75C6.33579 2.25 6 2.58579 6 3V4.5M12 4.5H6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
