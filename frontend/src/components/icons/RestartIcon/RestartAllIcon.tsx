import React from "react";

interface RestartAllIconProps {
  color?: string;
}

export const RestartAllIcon = ({ color = "currentColor" }: RestartAllIconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.3347 6.0013C12.3347 4.33464 10.2397 2.66797 8.00141 2.66797C5.76316 2.66797 3.84694 4.04675 3.05576 6.0013M13.3347 6.0013H10.0014M13.3347 6.0013V2.66797M2.66797 10.0013C3.66797 11.668 5.763 13.3346 8.00125 13.3346C10.2395 13.3346 12.1557 11.9559 12.9469 10.0013M2.66797 10.0013H6.0013M2.66797 10.0013V13.3346"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
