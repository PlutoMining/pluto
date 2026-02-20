/**
 * Validation utilities for miner-specific extra_config using AJV.
 *
 * Uses JSON schemas extracted from Pydantic models in pyasic-bridge,
 * ensuring client-side validation matches server-side validation exactly.
 */

import Ajv from "ajv";
import * as PyasicBridgeClient from "@pluto/pyasic-bridge-client";

// ExtraConfigSchemas is exported as a value from @pluto/pyasic-bridge-client,
// but TypeScript (with bundler moduleResolution) does not always see the
// named export correctly. We read it via a namespace import and fall back
// to an empty object for safety.
export const ExtraConfigSchemas =
  (PyasicBridgeClient as { ExtraConfigSchemas?: Record<string, unknown> }).ExtraConfigSchemas ??
  {};

type ExtraConfigSchemasMap = typeof ExtraConfigSchemas;

// Initialize AJV instance (reuse for performance)
const ajv = new Ajv({ allErrors: true, verbose: true });

// Cache validators per miner type to avoid recreating them
const validatorCache: Map<string, Ajv.ValidateFunction> = new Map();

/**
 * Create an AJV validator for a specific miner type.
 * 
 * @param minerType - Miner type string (e.g., "bitaxe", "espminer")
 * @param schemas - ExtraConfigSchemas object from generated client
 * @returns AJV validator function, or null if schema not found
 */
export function createValidatorForMinerType(
  minerType: string | null | undefined,
  schemas: ExtraConfigSchemasMap
): Ajv.ValidateFunction | null {
  if (!minerType) {
    return null;
  }

  const normalizedType = minerType.toLowerCase();
  
  // Check cache first
  if (validatorCache.has(normalizedType)) {
    return validatorCache.get(normalizedType)!;
  }

  // Find matching schema
  const schema = schemas[normalizedType];
  if (!schema) {
    return null;
  }

  // Compile validator
  try {
    const validator = ajv.compile(schema);
    validatorCache.set(normalizedType, validator);
    return validator;
  } catch (error) {
    console.error(`Failed to compile validator for miner type ${minerType}:`, error);
    return null;
  }
}

/**
 * Validate extra_config data against schema for a miner type.
 * 
 * @param data - Extra config data to validate
 * @param minerType - Miner type string
 * @param schemas - ExtraConfigSchemas object from generated client
 * @returns Object with `valid` boolean and `errors` array
 */
export function validateExtraConfig(
  data: Record<string, unknown>,
  minerType: string | null | undefined,
  schemas: ExtraConfigSchemasMap
): { valid: boolean; errors: string[] } {
  const validator = createValidatorForMinerType(minerType, schemas);
  
  if (!validator) {
    // No validator available - return valid (fallback to server-side validation)
    return { valid: true, errors: [] };
  }

  const valid = validator(data);
  
  if (valid) {
    return { valid: true, errors: [] };
  }

  // Format validation errors
  const errors = validator.errors?.map((err: any) => {
    const path = err.dataPath || err.schemaPath || "";
    const message = err.message || "Validation error";
    return path ? `${path}: ${message}` : message;
  }) || [];

  return { valid: false, errors };
}

/**
 * Get validation errors for a specific field.
 * 
 * @param validator - AJV validator function
 * @param data - Data to validate
 * @param fieldName - Field name to get errors for
 * @returns Array of error messages for the field
 */
export function getFieldValidationErrors(
  validator: Ajv.ValidateFunction | null,
  data: Record<string, unknown>,
  fieldName: string
): string[] {
  if (!validator) {
    return [];
  }

  const valid = validator(data);
  if (valid) {
    return [];
  }

  return (
    validator.errors
      ?.filter((err: any) => {
        const path = err.dataPath || "";
        return path === `/${fieldName}` || path.endsWith(`/${fieldName}`);
      })
      .map((err: any) => err.message || "Validation error") || []
  );
}
