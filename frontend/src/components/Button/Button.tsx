/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { MouseEventHandler, ReactElement } from "react";

import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant: "text" | "primary" | "outlined";
  label?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset" | undefined;
  isLoading?: boolean;
  borderColor?: string;
  icon?: ReactElement;
  rightIcon?: ReactElement;
  size?: string;
  transform?: "uppercase" | "capitalize";
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  label,
  onClick,
  disabled,
  type = "button",
  isLoading,
  icon,
  rightIcon,
  size = "sm",
  transform = "uppercase",
  className,
}) => {
  const mappedSize = size === "lg" ? "lg" : size === "md" ? "md" : "sm";

  return (
    <UiButton
      type={type}
      variant={variant}
      size={mappedSize}
      disabled={disabled || isLoading || false}
      onClick={onClick}
      className={cn(transform === "uppercase" ? "uppercase" : "capitalize", className)}
    >
      {icon ? <span className="mr-1 inline-flex">{icon}</span> : null}
      {label}
      {rightIcon ? <span className="ml-1 inline-flex">{rightIcon}</span> : null}
    </UiButton>
  );
};

export default Button;
