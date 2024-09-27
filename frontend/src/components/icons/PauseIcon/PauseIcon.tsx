import React from "react";

interface PauseIconProps {
  color: string;
}

export const PauseIcon = ({ color = "white" }: PauseIconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={"none"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.75 8.24805V15.748"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.25 8.24805V15.748"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 23.248C18.2132 23.248 23.25 18.2113 23.25 11.998C23.25 5.78484 18.2132 0.748047 12 0.748047C5.7868 0.748047 0.75 5.78484 0.75 11.998C0.75 18.2113 5.7868 23.248 12 23.248Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
