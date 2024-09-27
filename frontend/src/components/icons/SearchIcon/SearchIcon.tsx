import React from "react";

interface SearchIconProps {
  color: string;
}

export const SearchIcon = ({ color = "white" }: SearchIconProps) => {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.6667 15.6667L12.8807 12.8807M12.8807 12.8807C14.0871 11.6743 14.8333 10.0076 14.8333 8.16667C14.8333 4.48477 11.8486 1.5 8.16667 1.5C4.48477 1.5 1.5 4.48477 1.5 8.16667C1.5 11.8486 4.48477 14.8333 8.16667 14.8333C10.0076 14.8333 11.6743 14.0871 12.8807 12.8807Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

  );
};
