/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { ChangeEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

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
  const valueBeforeCustomRef = useRef<string>("");

  useEffect(() => {
    if (!allowCustom) return;
    if (selectedValue === CUSTOM_SENTINEL) return;
    setCustomDraft(selectedValue);
  }, [allowCustom, selectedValue]);

  useEffect(() => {
    if (!allowCustom) return;
    if (!isExternallyControlled) return;
    setSelectedValue((prev) => {
      // Keep "Custom…" selected when user explicitly chose it; don't overwrite with parent value
      if (prev === CUSTOM_SENTINEL) return prev;
      return toStringValue(value);
    });
    setCustomDraft(toStringValue(value));
  }, [allowCustom, isExternallyControlled, value]);

  useEffect(() => {
    if (!allowCustom) return;
    if (isExternallyControlled) return;
    const v = toStringValue(defaultValue);
    setSelectedValue(v);
    setCustomDraft(v);
  }, [allowCustom, defaultValue, isExternallyControlled]);

  const renderedOptions = useMemo(() => {
    if (!allowCustom) return optionValues;

    const baseValues = new Set(optionValues.map((o) => String(o.value)));
    const options: Array<{ label: string; value: string | number }> = [];

    if (
      selectedValue !== "" &&
      selectedValue !== CUSTOM_SENTINEL &&
      !baseValues.has(selectedValue)
    ) {
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
      valueBeforeCustomRef.current = selectedValue;
      setSelectedValue(CUSTOM_SENTINEL);
      setIsCustomMode(true);
      setCustomDraft(selectedValue);
      return;
    }

    const baseValues = new Set(optionValues.map((o) => String(o.value)));
    const nextIsCustom = e.target.value !== "" && !baseValues.has(String(e.target.value));
    setIsCustomMode(nextIsCustom);
    setSelectedValue(e.target.value);
    onChange(e);
  };

  const emitCustomValue = (rawValue: string) => {
    const value = rawValue.trim();
    if (!/^-?\d+$/.test(value)) return;

    // Ensure the custom option exists (rendered from selectedValue) before the next paint,
    // and force the parent onChange to run synchronously so Save/Restart sees fresh state.
    flushSync(() => {
      setSelectedValue(value);
      onChange({
        target: { name, value, type: "select-one" },
        currentTarget: { name, value, type: "select-one" },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    });
  };

  const handleCustomInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const next = e.target.value;
    setCustomDraft(next);

    // Keep parent state in sync while typing so "Save" uses the latest value,
    // but don't force a blur/commit.
    emitCustomValue(next);

    // Keep custom editor open; selecting a predefined option closes it.
    setIsCustomMode(true);
  };

  const commitCustomValue = (value: string) => {
    if (value === "") return;
    emitCustomValue(value);
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
        value={allowCustom ? selectedValue : value}
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
          onBlur={(e) => commitCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustomValue((e.currentTarget as HTMLInputElement).value);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              const reverted = valueBeforeCustomRef.current;
              setSelectedValue(reverted);
              setCustomDraft(reverted);
              setIsCustomMode(false);
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
