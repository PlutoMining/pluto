import { useToken } from "@chakra-ui/react";
import React, { MouseEventHandler } from "react";

interface DeleteIconProps {
  color?: string;
  w?: string;
  h?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

export const DeleteIcon = ({
  color = "cta-icon-color",
  w = "24",
  h = "24",
  onClick,
}: DeleteIconProps) => {
  const [fillColor] = useToken("colors", [color]);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 14 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.75 3V1.5H9.25V3H4.75ZM3.25 3V1C3.25 0.734784 3.35536 0.48043 3.54289 0.292893C3.73043 0.105357 3.98478 0 4.25 0L9.75 0C10.0152 0 10.2696 0.105357 10.4571 0.292893C10.6446 0.48043 10.75 0.734784 10.75 1V3H13.25C13.4489 3 13.6397 3.07902 13.7803 3.21967C13.921 3.36032 14 3.55109 14 3.75C14 3.94891 13.921 4.13968 13.7803 4.28033C13.6397 4.42098 13.4489 4.5 13.25 4.5H12.885L12.142 14.153C12.1034 14.6554 11.8767 15.1248 11.507 15.4673C11.1373 15.8097 10.6519 16 10.148 16H3.852C3.34808 16 2.86274 15.8097 2.49304 15.4673C2.12335 15.1248 1.89655 14.6554 1.858 14.153L1.115 4.5H0.75C0.551088 4.5 0.360322 4.42098 0.21967 4.28033C0.0790177 4.13968 0 3.94891 0 3.75C0 3.55109 0.0790177 3.36032 0.21967 3.21967C0.360322 3.07902 0.551088 3 0.75 3H3.25ZM2.62 4.5H11.38L10.646 14.038C10.6364 14.1636 10.5798 14.2809 10.4875 14.3666C10.3952 14.4522 10.2739 14.4999 10.148 14.5H3.852C3.72607 14.4999 3.60482 14.4522 3.5125 14.3666C3.42017 14.2809 3.36357 14.1636 3.354 14.038L2.62 4.5Z"
        fill={fillColor}
      />
    </svg>
  );
};
