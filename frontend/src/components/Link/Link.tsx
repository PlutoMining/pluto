/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ElementType, ReactElement } from "react";
import NextLink from "next/link";

import { cn } from "@/lib/utils";

interface LinkProps {
  label: string;
  href: string;
  leftIcon?: ReactElement;
  rightIcon?: ReactElement;
  className?: string;
  fontWeight?: string | number;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  textDecoration?: string;
  isDisabled?: boolean;
  isExternal?: boolean;
  as?: ElementType;
}

const Link: React.FC<LinkProps> = ({
  label,
  href,
  leftIcon,
  rightIcon,
  className,
  fontWeight = 400,
  fontFamily = "heading",
  fontSize = "13px",
  color,
  textDecoration,
  isDisabled,
  isExternal,
  as,
}) => {
  if (isDisabled) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 opacity-60",
          fontFamily === "accent" ? "font-accent" : "font-heading",
          className
        )}
        style={{ fontWeight, fontSize, textDecoration, color }}
      >
        {leftIcon}
        {label}
        {rightIcon}
      </span>
    );
  }

  const Component: any = as ?? (isExternal ? "a" : NextLink);

  const externalProps = isExternal
    ? {
        target: "_blank",
        rel: "noreferrer",
      }
    : {};

  return (
    <Component
      href={href}
      {...externalProps}
      className={cn(
        "inline-flex items-center gap-1 hover:underline",
        fontFamily === "accent" ? "font-accent" : "font-heading",
        className
      )}
      style={{ fontWeight, fontSize, textDecoration, color }}
    >
      {leftIcon}
      {label}
      {rightIcon}
    </Component>
  );
};

export default Link;
