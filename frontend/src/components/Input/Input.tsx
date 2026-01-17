/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ChangeEventHandler } from "react";

import { Input as UiInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InputProps {
  label?: string;
  name: string;
  id: string;
  type?: "text" | "number" | "password";
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  pattern?: string;
  error?: string;
  isInvalid?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  leftAddon?: string;
  rightAddon?: string;
  isDisabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  name,
  id,
  type = "text",
  defaultValue,
  value,
  pattern,
  onChange,
  error,
  leftAddon,
  rightAddon,
  isDisabled,
}) => {
  const hasError = Boolean(error);

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label
          htmlFor={name}
          className={cn("text-xs font-semibold uppercase", "font-body")}
        >
          {label}
        </label>
      ) : null}

      <div className="flex">
        {leftAddon ? (
          <div className="inline-flex h-10 items-center border border-input bg-muted px-3 text-sm text-muted-foreground">
            {leftAddon}
          </div>
        ) : null}

        <UiInput
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          value={value}
          pattern={pattern}
          onChange={onChange}
          disabled={isDisabled}
          aria-invalid={hasError}
          className={cn(
            "h-10 font-accent text-[13px]",
            leftAddon ? "rounded-none border-l-0" : "rounded-none",
            rightAddon ? "rounded-none border-r-0" : "rounded-none",
            hasError ? "border-destructive focus-visible:ring-destructive" : null
          )}
        />

        {rightAddon ? (
          <div
            className={cn(
              "inline-flex h-10 items-center border border-input bg-muted px-3 text-sm",
              "font-accent text-[13px]",
              isDisabled ? "opacity-60" : null,
              hasError ? "border-destructive" : null
            )}
          >
            {rightAddon}
          </div>
        ) : null}
      </div>

      {error ? <p className="pt-1 font-accent text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
};
