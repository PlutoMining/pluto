/**
 * Schema types for driver-defined configuration forms.
 *
 * Each driver declares a ConfigFormSchema describing the editable
 * vendor-specific fields, grouped into sections.  The frontend
 * renders these generically — no miner-type branching required.
 */

/* ---------- Field types -------------------------------------------------- */

export interface ConfigFieldBase {
  name: string;
  label: string;
  required?: boolean;
  readonly?: boolean;
}

export interface NumberField extends ConfigFieldBase {
  type: "number";
  min?: number;
  max?: number;
  unit?: string;
}

export interface TextField extends ConfigFieldBase {
  type: "text";
}

export interface CheckboxField extends ConfigFieldBase {
  type: "checkbox";
}

export interface SelectField extends ConfigFieldBase {
  type: "select";
  options: { label: string; value: string | number }[];
}

export type ConfigField = NumberField | TextField | CheckboxField | SelectField;

/* ---------- Sections & schema -------------------------------------------- */

export interface ConfigSection {
  key: string;
  label: string;
  columns?: number;
  fields: ConfigField[];
}

export interface ConfigFormSchema {
  sections: ConfigSection[];
}
