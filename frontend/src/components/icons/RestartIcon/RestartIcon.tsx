import { useToken } from "@chakra-ui/react";
import React from "react";

interface RestartIconProps {
  color?: string;
}

export const RestartIcon = ({ color = "cta-icon-color" }: RestartIconProps) => {
  const [strokeColor] = useToken("colors", [color]);

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.8111 8.5C12.145 11.0878 9.79588 13 7.00012 13C3.68641 13 1.00012 10.3137 1.00012 7C1.00012 3.68629 3.68641 1 7.00012 1C9.51815 1 11.8751 2.875 13.0001 4.75M13.0001 4.75H9.25006M13.0001 4.75V1"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
