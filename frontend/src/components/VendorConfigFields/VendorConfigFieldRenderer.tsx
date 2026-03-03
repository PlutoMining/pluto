/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import React, { useCallback } from "react";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import type { ConfigField } from "@pluto/interfaces";

export interface VendorConfigFieldRendererProps {
  field: ConfigField;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  deviceMac: string;
  error?: string;
}

export const VendorConfigFieldRenderer: React.FC<VendorConfigFieldRendererProps> = ({
  field,
  value,
  onChange,
  deviceMac,
  error,
}) => {
  const id = `${deviceMac}-${field.name}`;

  const handleChange = useCallback(
    (name: string, nextValue: unknown) => {
      onChange(name, nextValue);
    },
    [onChange]
  );

  if (field.type === "select") {
    const optionValues = field.options.map((o) => ({
      label: o.label,
      value: o.value,
    }));
    const strValue =
      value !== undefined && value !== null ? String(value) : "";
    return (
      <Select
        id={id}
        label={field.label}
        name={field.name}
        value={strValue}
        optionValues={optionValues}
        allowCustom={false}
        onChange={(e) => {
          const raw = e.target.value;
          const n = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
          handleChange(field.name, n);
        }}
      />
    );
  }

  if (field.type === "checkbox") {
    const checked = value === 1 || value === true;
    return (
      <Checkbox
        id={id}
        name={field.name}
        label={field.label}
        isChecked={checked}
        onChange={(e) => {
          handleChange(field.name, e.target.checked ? 1 : 0);
        }}
      />
    );
  }

  if (field.type === "number") {
    const numValue =
      value !== undefined && value !== null ? String(value) : "";
    return (
      <Input
        id={id}
        name={field.name}
        label={field.label}
        type="number"
        defaultValue={numValue}
        error={error}
        rightAddon={field.unit}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            handleChange(field.name, undefined);
            return;
          }
          const n = Number(raw);
          handleChange(field.name, Number.isFinite(n) ? n : undefined);
        }}
      />
    );
  }

  // text
  const strValue =
    value !== undefined && value !== null ? String(value) : "";
  return (
    <Input
      id={id}
      name={field.name}
      label={field.label}
      type="text"
      defaultValue={strValue}
      error={error}
      onChange={(e) => handleChange(field.name, e.target.value || undefined)}
    />
  );
};
