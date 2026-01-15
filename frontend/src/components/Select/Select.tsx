/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ChangeEventHandler } from "react";

import { cn } from "@/lib/utils";

interface SelectProps {
  label: string;
  name: string;
  id: string;
  value?: string | number;
  defaultValue?: string | number;
  optionValues: Array<{ label: string; value: string | number }>;
  onChange: ChangeEventHandler<HTMLSelectElement>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  id,
  value,
  defaultValue,
  optionValues = [],
  onChange,
}) => {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={name} className={cn("text-xs font-semibold uppercase", "font-body")}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        onChange={onChange}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "h-10 w-full rounded-none border border-input bg-background px-3",
          "font-accent text-[13px] text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {optionValues.map((elem, index) => (
          <option key={`option-${index}-${elem.value}`} value={elem.value}>
            {elem.label}
          </option>
        ))}
      </select>
    </div>
  );
};
