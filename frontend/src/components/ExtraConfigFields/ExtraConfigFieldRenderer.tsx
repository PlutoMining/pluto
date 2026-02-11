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
import {
  getEnumOptionsFromPropSchema,
  getFieldWidgetType,
} from "@/utils/schemaFormHelpers";

export interface ExtraConfigFieldRendererProps {
  fieldName: string;
  fieldSchema: Record<string, unknown>;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  deviceMac: string;
  error?: string;
}

export const ExtraConfigFieldRenderer: React.FC<ExtraConfigFieldRendererProps> = ({
  fieldName,
  fieldSchema,
  value,
  onChange,
  deviceMac,
  error,
}) => {
  const id = `${deviceMac}-${fieldName}`;
  const label = (fieldSchema.title as string) || fieldName;
  const widgetType = getFieldWidgetType(fieldSchema);

  const handleChange = useCallback(
    (name: string, nextValue: unknown) => {
      onChange(name, nextValue);
    },
    [onChange]
  );

  if (widgetType === "select") {
    const optionValues = getEnumOptionsFromPropSchema(fieldSchema);
    const strValue =
      value !== undefined && value !== null ? String(value) : "";
    return (
      <Select
        id={id}
        label={label}
        name={fieldName}
        value={strValue}
        optionValues={optionValues}
        allowCustom={false}
        onChange={(e) => {
          const raw = e.target.value;
          const n = /^-?\d+$/.test(raw) ? parseInt(raw, 10) : raw;
          handleChange(fieldName, n);
        }}
      />
    );
  }

  if (widgetType === "checkbox") {
    const checked = value === 1 || value === true;
    return (
      <Checkbox
        id={id}
        name={fieldName}
        label={label}
        isChecked={checked}
        onChange={(e) => {
          handleChange(fieldName, e.target.checked ? 1 : 0);
        }}
      />
    );
  }

  if (widgetType === "number") {
    const numValue =
      value !== undefined && value !== null ? String(value) : "";
    return (
      <Input
        id={id}
        name={fieldName}
        label={label}
        type="number"
        defaultValue={numValue}
        error={error}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            handleChange(fieldName, undefined);
            return;
          }
          const n = parseInt(raw, 10);
          handleChange(fieldName, Number.isFinite(n) ? n : undefined);
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
      name={fieldName}
      label={label}
      type="text"
      defaultValue={strValue}
      error={error}
      onChange={(e) => handleChange(fieldName, e.target.value || undefined)}
    />
  );
};
