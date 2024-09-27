import React, { MouseEventHandler } from "react";

interface InfoIconProps {
  color: string;
  onClick: MouseEventHandler<SVGSVGElement>;
}

export const InfoIcon = ({ color = "white", onClick }: InfoIconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path
        d="M14.25 16.5H13.5C12.6716 16.5 12 15.8284 12 15V11.25C12 10.8358 11.6642 10.5 11.25 10.5H10.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.625 6.75C11.4179 6.75 11.25 6.91789 11.25 7.125C11.25 7.33211 11.4179 7.5 11.625 7.5C11.8321 7.5 12 7.33211 12 7.125C12 6.91789 11.8321 6.75 11.625 6.75V6.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 23.25C18.2132 23.25 23.25 18.2132 23.25 12C23.25 5.7868 18.2132 0.75 12 0.75C5.7868 0.75 0.75 5.7868 0.75 12C0.75 18.2132 5.7868 23.25 12 23.25Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
