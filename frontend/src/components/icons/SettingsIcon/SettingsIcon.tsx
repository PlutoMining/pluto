import React from "react";

interface SettingsIconProps {
  className?: string;
  color?: string;
}

export const SettingsIcon = ({ className, color }: SettingsIconProps) => {
  return (
    <svg
      className={className}
      style={color ? { color } : undefined}
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25 13C25 19.6274 19.6274 25 13 25C6.37258 25 1 19.6274 1 13C1 6.37258 6.37258 1 13 1C19.6274 1 25 6.37258 25 13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g transform="translate(4.5, 5)">
        <path
          d="M10.5621 1H5.89548V3.11111L5.15785 3.53262L3.33333 2.47923L1 6.52068L2.78437 7.55089V8.44903L1 9.47923L3.33333 13.5207L5.15777 12.4673L5.89548 12.8889V15H10.5621V12.8889L11.2999 12.4673L13.1244 13.5207L15.4577 9.47923L13.6733 8.44899V7.55093L15.4577 6.52069L13.1244 2.47923L11.2998 3.53263L10.5621 3.11111V1Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
