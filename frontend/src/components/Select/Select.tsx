/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ChangeEventHandler, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface SelectProps {
  label: string;
  name: string;
  id: string;
  value?: string | number;
  defaultValue?: string | number;
  optionValues: Array<{ label: string; value: string | number }>;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  allowCustom?: boolean;
  customOptionLabel?: string;
  customValueSuffix?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  id,
  value,
  defaultValue,
  optionValues = [],
  onChange,
  allowCustom = false,
  customOptionLabel = "Custom…",
  customValueSuffix = "(custom)",
}) => {
  const CUSTOM_SENTINEL = "__custom__";
  const toStringValue = (v: string | number | undefined) => (v === undefined ? "" : String(v));

  const isExternallyControlled = value !== undefined;
  const [selectedValue, setSelectedValue] = useState<string>(() => toStringValue(value ?? defaultValue));
  const [customDraft, setCustomDraft] = useState<string>(() => toStringValue(value ?? defaultValue));
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    if (!allowCustom) return;
    setCustomDraft(selectedValue);
  }, [allowCustom, selectedValue]);

  useEffect(() => {
    if (!allowCustom) return;
    if (!isExternallyControlled) return;
    const v = toStringValue(value);
    setSelectedValue(v);
    setCustomDraft(v);
    setIsCustomMode(false);
  }, [allowCustom, isExternallyControlled, value]);

  useEffect(() => {
    if (!allowCustom) return;
    if (isExternallyControlled) return;
    const v = toStringValue(defaultValue);
    setSelectedValue(v);
    setCustomDraft(v);
    setIsCustomMode(false);
  }, [allowCustom, defaultValue, isExternallyControlled]);

  const renderedOptions = useMemo(() => {
    if (!allowCustom) return optionValues;

    const baseValues = new Set(optionValues.map((o) => String(o.value)));
    const options: Array<{ label: string; value: string | number }> = [];

    if (selectedValue !== "" && !baseValues.has(selectedValue)) {
      options.push({ value: selectedValue, label: `${selectedValue} ${customValueSuffix}` });
    }

    options.push(...optionValues);
    options.push({ value: CUSTOM_SENTINEL, label: customOptionLabel });

    return options;
  }, [allowCustom, customOptionLabel, customValueSuffix, optionValues, selectedValue]);

  const selectedIsCustom = useMemo(() => {
    if (!allowCustom) return false;
    const baseValues = new Set(optionValues.map((o) => String(o.value)));
    return selectedValue !== "" && !baseValues.has(selectedValue);
  }, [allowCustom, optionValues, selectedValue]);

  const handleSelectChange: ChangeEventHandler<HTMLSelectElement> = (e) => {
    if (!allowCustom) {
      onChange(e);
      return;
    }

    if (e.target.value === CUSTOM_SENTINEL) {
      setIsCustomMode(true);
      setCustomDraft(selectedValue);
      return;
    }

    setIsCustomMode(false);
    setSelectedValue(e.target.value);
    onChange(e);
  };

  const handleCustomInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setCustomDraft(e.target.value);
  };

  const commitCustomValue = () => {
    setIsCustomMode(false);
    if (customDraft === "") return;
    setSelectedValue(customDraft);

    const syntheticEvent = {
      target: {
        name,
        value: customDraft,
        type: "number",
      },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={name} className={cn("text-xs font-semibold uppercase", "font-body")}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        onChange={handleSelectChange}
        value={allowCustom ? (isCustomMode ? CUSTOM_SENTINEL : selectedValue) : value}
        defaultValue={allowCustom ? undefined : defaultValue}
        className={cn(
          "h-10 w-full rounded-none border border-input bg-background px-3",
          "font-accent text-[13px] text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {renderedOptions.map((elem, index) => (
          <option key={`option-${index}-${elem.value}`} value={elem.value}>
            {elem.label}
          </option>
        ))}
      </select>

      {allowCustom && (isCustomMode || selectedIsCustom) ? (
        <input
          id={`${id}-custom`}
          name={name}
          type="number"
          inputMode="numeric"
          value={customDraft}
          onChange={handleCustomInputChange}
          onBlur={commitCustomValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustomValue();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setIsCustomMode(false);
              setCustomDraft(selectedValue);
            }
          }}
          className={cn(
            "h-10 w-full rounded-none border border-input bg-background px-3",
            "font-accent text-[13px] text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        />
      ) : null}
    </div>
  );
};
