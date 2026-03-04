import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
