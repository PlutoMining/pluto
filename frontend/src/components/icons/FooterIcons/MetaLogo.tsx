import { Link } from "@chakra-ui/react";
import React from "react";

interface MetaLogoProps {
  url?: string;
}

export const MetaLogo = ({ url }: MetaLogoProps) => {
  return (
    <Link href={url}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.1625 1.49994H14.3688L9.55003 7.00619L15.2188 14.4999H10.7813L7.30315 9.95619L3.32815 14.4999H1.11877L6.2719 8.60931L0.837524 1.49994H5.38752L8.52815 5.65306L12.1625 1.49994ZM11.3875 13.1812H12.6094L4.7219 2.74994H3.4094L11.3875 13.1812Z"
          fill="#F0EDF2"
        />
      </svg>
    </Link>
  );
};
