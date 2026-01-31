/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ChangeEventHandler } from "react";

import { Input as UiInput } from "@/components/ui/input";
import { IconSearch } from "@/components/icons/FigmaIcons";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  label: string;
  type?: "text" | "number" | "password";
  placeholder?: string;
  defaultValue?: string | number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  label,
  placeholder,
  type = "text",
  onChange,
  className,
  inputClassName,
}) => {
  return (
    <div className={cn("relative w-full", className)}>
      <IconSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
      <UiInput
        type={type}
        placeholder={placeholder}
        aria-label={label}
        onChange={onChange}
        className={cn(
          "h-10 w-full rounded-none border border-border bg-muted pl-10 pr-3 font-accent text-[13px] text-foreground",
          "placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0",
          "dark:bg-[#161B1F] dark:text-[#CBCCCC] dark:placeholder:text-[#CBCCCC]/50",
          inputClassName
        )}
      />
    </div>
  );
};
