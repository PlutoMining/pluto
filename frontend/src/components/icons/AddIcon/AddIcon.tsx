import React from "react";

interface AddIconProps {
  color: string;
}

export const AddIcon = ({ color = "white" }: AddIconProps) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.6665 8.5H7.99984M7.99984 8.5L11.3332 8.5M7.99984 8.5V5.16667M7.99984 8.5V11.8333" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

  );
};
