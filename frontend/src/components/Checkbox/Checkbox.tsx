/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { ChangeEvent } from "react";
import React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  id: string;
  name: string;
  label?: string;
  isChecked?: boolean;
  defaultChecked?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  flexDir?: "row" | "column";
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  id,
  isChecked,
  onChange,
  defaultChecked,
  flexDir = "row",
}) => {
  return (
    <label
      className={cn(
        "flex w-full gap-2",
        flexDir === "column" ? "flex-col items-start" : "items-center"
      )}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        onChange={onChange}
        checked={isChecked}
        defaultChecked={defaultChecked}
        className={cn(
          "h-4 w-4 rounded-none border border-input bg-background",
          "accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      />
      {label ? (
        <span className="flex-1 font-accent text-sm font-medium text-foreground">{label}</span>
      ) : null}
    </label>
  );
};
