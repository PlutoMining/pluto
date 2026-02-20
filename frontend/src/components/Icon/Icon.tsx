import * as React from "react";

import { cn } from "@/lib/utils";

export type MaterialSymbolName = string;

export interface IconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  name: MaterialSymbolName;
  size?: number;
  fill?: 0 | 1;
  weight?: number;
  grade?: number;
  opticalSize?: number;
  label?: string;
}

export function Icon({
  name,
  size = 20,
  fill = 0,
  weight = 400,
  grade = 0,
  opticalSize = 20,
  label,
  className,
  style,
  ...props
}: IconProps) {
  const ariaProps = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      {...ariaProps}
      data-icon="material"
      className={cn("material-symbols-outlined leading-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `"FILL" ${fill}, "wght" ${weight}, "GRAD" ${grade}, "opsz" ${opticalSize}`,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
