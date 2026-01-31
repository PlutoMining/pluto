/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ChangeEventHandler } from "react";

import { Input as UiInput } from "@/components/ui/input";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  label: string;
  type?: "text" | "number" | "password";
  placeholder?: string;
  defaultValue?: string | number;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  type = "text",
  onChange,
}) => {
  return (
    <div className="relative">
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
      <UiInput
        type={type}
        placeholder={placeholder}
        onChange={onChange}
        className={cn("h-10 rounded-none pl-9 font-accent text-[13px]")}
      />
    </div>
  );
};
