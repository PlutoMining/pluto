import React, { MouseEventHandler } from "react";

interface PauseIconProps {
  color?: string;
  w?: string;
  h?: string;
  onClick: MouseEventHandler<SVGSVGElement>;
}

export const CloseIcon = ({ color = "white", w = "24", h = "24", onClick }: PauseIconProps) => {
  return (
    <svg
      width={w}
      height={h}
      viewBox={'0 0 24 24'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path
        d="M15.1824 8.81812L8.81836 15.1811"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.81836 8.81812L15.1824 15.1811"
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
