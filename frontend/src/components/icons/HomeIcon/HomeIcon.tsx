import React from "react";

interface HomeIconProps {
  color: string;
}

export const HomeIcon = ({ color = "white" }: HomeIconProps) => {
  return (
    <svg fill={color} height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
      <path
        clipRule="evenodd"
        d="M22.8681 8.94701L12.0001 0.747009L1.12212 8.94701C0.897235 9.15453 0.762012 9.44147 0.745117 9.74701V22.269C0.746764 22.8085 1.18367 23.2454 1.72312 23.247H8.24512V18C8.24512 15.9289 9.92405 14.25 11.9951 14.25C14.0662 14.25 15.7451 15.9289 15.7451 18V23.25H22.2661C22.8057 23.2484 23.2429 22.8116 23.2451 22.272V9.74701C23.2278 9.44158 23.0927 9.15478 22.8681 8.94701Z"
        fillRule="evenodd"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
};
