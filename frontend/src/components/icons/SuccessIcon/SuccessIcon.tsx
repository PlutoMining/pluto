import React from "react";

interface SuccessIconProps {
  color?: string;
  w?: string;
  h?: string;
}

export const SuccessIcon = ({ color = "white", w = "24", h = "24" }: SuccessIconProps) => {
  return (
    <svg width={w} height={h} viewBox={'0 0 24 24'} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.40039 13.1415L8.68706 16.3867C8.86304 16.6496 9.1552 16.8112 9.4714 16.8207C9.78761 16.8301 10.0889 16.6862 10.2803 16.4343L17.6004 7.17285" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12 22.499C17.799 22.499 22.5 17.798 22.5 11.999C22.5 6.20003 17.799 1.49902 12 1.49902C6.20101 1.49902 1.5 6.20003 1.5 11.999C1.5 17.798 6.20101 22.499 12 22.499Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
