import React from "react";

interface SignalIconProps {
  color: string;
}

export const SignalIcon = ({ color = "white" }: SignalIconProps) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.99984 8.5V8.49333M11.7711 4.72876C13.8539 6.81156 13.8539 10.1884 11.7711 12.2712M4.2286 12.2712C2.1458 10.1884 2.1458 6.81156 4.2286 4.72876M9.88545 6.61438C10.9268 7.65578 10.9268 9.34422 9.88545 10.3856M6.11421 10.3856C5.07281 9.34422 5.07281 7.65578 6.11421 6.61438" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

  );
};
