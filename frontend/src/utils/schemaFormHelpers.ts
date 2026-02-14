/**
 * Utilities for schema-driven extra_config form rendering.
 * Extracts form metadata from JSON schemas (e.g. BitaxeExtraConfigSchema).
 */

import type { DropdownOption } from "@pluto/interfaces";

/** Resolve property schema from anyOf (find non-null branch). */
function resolvePropSchema(propSchema: Record<string, unknown>): Record<string, unknown> | null {
  const anyOf = propSchema.anyOf as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(anyOf)) {
    const nonNull = anyOf.find((b) => b.type !== "null");
    if (nonNull && typeof nonNull === "object") return nonNull;
  }
  if (propSchema.type && propSchema.type !== "null") return propSchema;
  return null;
}

/**
 * Extract enum values from schema.properties[fieldName].
 * Handles anyOf: [{ type: "integer", enum: [...] }, { type: "null" }].
 */
export function getEnumOptionsFromSchema(
  schema: Record<string, unknown>,
  fieldName: string
): DropdownOption[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props || !(fieldName in props)) return [];

  const propSchema = props[fieldName];
  return getEnumOptionsFromPropSchema(propSchema);
}

/**
 * Extract enum options from a single property schema (e.g. from anyOf branch).
 */
export function getEnumOptionsFromPropSchema(
  propSchema: Record<string, unknown>
): DropdownOption[] {
  const resolved = resolvePropSchema(propSchema);
  if (!resolved) return [];

  const enumArr = resolved.enum;
  if (!Array.isArray(enumArr)) return [];

  return enumArr.map((v) => ({
    label: String(v),
    value: typeof v === "number" ? v : Number(v),
  }));
}

export type FieldWidgetType = "select" | "number" | "checkbox" | "text";

/**
 * Determine widget type from property schema.
 * Handles anyOf; checkbox for integer enum [0, 1].
 */
export function getFieldWidgetType(propSchema: Record<string, unknown>): FieldWidgetType {
  const resolved = resolvePropSchema(propSchema);
  if (!resolved) return "text";

  const enumArr = resolved.enum;
  if (Array.isArray(enumArr)) {
    if (enumArr.length === 2 && enumArr.includes(0) && enumArr.includes(1)) return "checkbox";
    return "select";
  }

  const type = resolved.type;
  if (type === "integer") return "number";
  if (type === "string") return "text";
  return "text";
}

/**
 * Return field names from schema.properties, or empty array.
 */
export function getExtraConfigFields(schema: Record<string, unknown>): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props || typeof props !== "object") return [];
  return Object.keys(props);
}

/** Preferred display order per miner type. Fallback to schema key order when null. */
const FIELD_ORDER: Record<string, string[]> = {
  bitaxe: [
    "frequency",
    "core_voltage",
    "rotation",
    "invertscreen",
    "display_timeout",
    "overheat_mode",
    "overclock_enabled",
    "stats_frequency",
    "min_fan_speed",
  ],
  espminer: [
    "frequency",
    "core_voltage",
    "rotation",
    "invertscreen",
    "display_timeout",
    "overheat_mode",
    "overclock_enabled",
    "stats_frequency",
    "min_fan_speed",
  ],
};

/**
 * Return preferred field order for miner type, or null to use schema key order.
 */
export function getFieldDisplayOrder(minerType: string): string[] | null {
  if (!minerType) return null;
  const key = minerType.toLowerCase();
  if (key in FIELD_ORDER) return FIELD_ORDER[key];
  return null;
}

/**
 * Return ordered list of extra_config field names for display.
 */
export function getOrderedExtraConfigFields(
  schema: Record<string, unknown>,
  minerType: string
): string[] {
  const fields = getExtraConfigFields(schema);
  if (fields.length === 0) return [];

  const order = getFieldDisplayOrder(minerType);
  if (!order) return fields;

  const ordered: string[] = [];
  const set = new Set(fields);
  for (const name of order) {
    if (set.has(name)) ordered.push(name);
  }
  for (const name of fields) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}
