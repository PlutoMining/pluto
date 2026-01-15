import React from "react";

import { PlutoCircleLogo } from "../PlutoLogo/PlutoCircleLogo";

interface LogoProps {
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <div className={className}>
      <PlutoCircleLogo color="currentColor" />
    </div>
  );
};
