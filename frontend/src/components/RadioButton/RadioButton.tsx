/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React from "react";

interface RadioButtonProps {
  id: string;
  value: string;
  label: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  value,
  id,
  name,
  checked,
  defaultChecked,
  onChange,
  disabled,
}) => {
  return (
    <label className="inline-flex items-center gap-2 font-accent text-sm font-medium text-foreground">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
        className="h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
};
