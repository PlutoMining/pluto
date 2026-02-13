/**
 * Factory for creating miner-specific settings models.
 * 
 * Dynamically instantiates settings models based on miner type,
 * providing form state, validation, and conversion utilities.
 */

import type { DiscoveredMiner } from "@pluto/interfaces";
import { getExtraConfigFields as getExtraConfigFieldsFromSchema } from "./schemaFormHelpers";
import {
  ExtraConfigSchemas,
  createValidatorForMinerType,
  validateExtraConfig,
  getFieldValidationErrors,
} from "./minerSettingsValidation";

/**
 * Generic miner settings model interface.
 * Provides form state, validation, and conversion utilities.
 */
export interface MinerSettingsModel<T = Record<string, unknown>> {
  /** Current form state values */
  formState: T;

  /** JSON schema for this miner type (for dynamic form rendering) */
  jsonSchema: Record<string, unknown>;

  /** Validate the current form state */
  validate(): { valid: boolean; errors: string[] };

  /** Validate a specific field */
  validateField(fieldName: string): string[];

  /** Convert form state to extra_config dictionary */
  toExtraConfig(): Record<string, unknown>;

  /** Update form state */
  updateField<K extends keyof T>(field: K, value: T[K]): void;

  /** Get current form state */
  getFormState(): T;

  /** Field names from jsonSchema.properties; used to conditionally render extra_config section */
  getExtraConfigFields(): string[];
}

/**
 * Factory class for creating miner-specific settings models.
 */
export class MinerSettingsFactory {
  /**
   * Create a settings model for a specific miner.
   * 
   * @param device - DiscoveredMiner instance
   * @returns MinerSettingsModel instance (always returns a model, uses default for unknown types)
   */
  static createModelForMiner(device: DiscoveredMiner): MinerSettingsModel {
    const minerType = MinerSettingsFactory.normalizeMinerType(device);
    
    if (MinerSettingsFactory.isBitaxe(minerType)) {
      return MinerSettingsFactory.createBitaxeModel(device);
    }
    
    // Fallback: return default model for unknown miner types
    // This preserves extra_config fields without validation
    return MinerSettingsFactory.createDefaultModel(device);
  }

  /**
   * Normalize miner type from DiscoveredMiner.
   * 
   * @param device - DiscoveredMiner instance
   * @returns Normalized miner type string
   */
  static normalizeMinerType(device: DiscoveredMiner): string {
    const minerData = device.minerData;
    const type = device.type;
    const model = minerData?.device_info?.model;
    const make = minerData?.device_info?.make ?? minerData?.make;

    const candidates = [type, make, model]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .map((v) => v.toLowerCase());

    // Prefer explicit Bitaxe / espminer detection based on make/model/type
    if (candidates.some((v) => v.includes("bitaxe"))) {
      return "bitaxe";
    }
    if (candidates.some((v) => v.includes("espminer"))) {
      return "espminer";
    }

    // Fallback: return type or model string if present
    if (type) {
      return type.toLowerCase();
    }
    if (model) {
      return model.toLowerCase();
    }

    return "";
  }

  /**
   * Check if miner type is Bitaxe.
   * 
   * @param minerType - Miner type string
   * @returns True if Bitaxe miner
   */
  static isBitaxe(minerType: string | null | undefined): boolean {
    if (!minerType) {
      return false;
    }
    const normalized = minerType.toLowerCase();
    return normalized.includes("bitaxe") || normalized.includes("espminer");
  }

  /**
   * Create Bitaxe settings model.
   * 
   * @param device - DiscoveredMiner instance
   * @returns Bitaxe MinerSettingsModel instance
   */
  static createBitaxeModel(device: DiscoveredMiner): MinerSettingsModel<Record<string, unknown>> {
    // Get current extra_config from minerData
    const extraConfig = device.minerData?.config?.extra_config as Record<string, unknown> | undefined;
    
    // Initialize form state from extra_config
    // Include Bitaxe-specific fields and generic extra_config fields used in the UI
    const formState: Record<string, unknown> = {
      // Bitaxe-specific fields
      frequency: extraConfig?.frequency as number | undefined,
      core_voltage: extraConfig?.core_voltage as number | undefined,
      rotation: extraConfig?.rotation as number | undefined,
      invertscreen: extraConfig?.invertscreen as number | undefined,
      display_timeout: extraConfig?.display_timeout as number | undefined,
      overheat_mode: extraConfig?.overheat_mode as number | undefined,
      overclock_enabled: extraConfig?.overclock_enabled as number | undefined,
      stats_frequency: extraConfig?.stats_frequency as number | undefined,
      min_fan_speed: extraConfig?.min_fan_speed as number | undefined,
      // Generic extra_config fields used in the UI
      fanspeed: extraConfig?.fanspeed as number | undefined,
      autofanspeed: extraConfig?.autofanspeed as number | undefined,
      flipscreen: extraConfig?.flipscreen as number | undefined,
      invertfanpolarity: extraConfig?.invertfanpolarity as number | undefined,
    };

    // Get JSON schema for Bitaxe
    const minerType = MinerSettingsFactory.normalizeMinerType(device);
    const schemaKey = minerType.includes("bitaxe") ? "bitaxe" : "espminer";
    const schema = (ExtraConfigSchemas[schemaKey] || ExtraConfigSchemas.bitaxe) as Record<string, unknown>;
    
    // Create validator
    const validator = createValidatorForMinerType("bitaxe", ExtraConfigSchemas);

    return {
      formState,
      jsonSchema: schema as Record<string, unknown>,
      
      validate(): { valid: boolean; errors: string[] } {
        return validateExtraConfig(this.formState as Record<string, unknown>, "bitaxe", ExtraConfigSchemas);
      },
      
      validateField(fieldName: string): string[] {
        return getFieldValidationErrors(validator, this.formState as Record<string, unknown>, fieldName);
      },
      
      toExtraConfig(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        
        // Only include defined fields (not undefined)
        Object.entries(this.formState).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            result[key] = value;
          }
        });
        
        return result;
      },
      
      updateField(field: string, value: unknown): void {
        this.formState[field] = value;
      },
      
      getFormState(): Record<string, unknown> {
        return { ...this.formState };
      },

      getExtraConfigFields(): string[] {
        return getExtraConfigFieldsFromSchema(this.jsonSchema);
      },
    };
  }

  /**
   * Create default settings model for unknown miner types.
   * 
   * This model preserves all extra_config fields without validation,
   * allowing any miner type to have extra_config fields while not
   * enforcing miner-specific constraints.
   * 
   * @param device - DiscoveredMiner instance
   * @returns Default MinerSettingsModel instance
   */
  static createDefaultModel(device: DiscoveredMiner): MinerSettingsModel<Record<string, unknown>> {
    // Get current extra_config from minerData
    const extraConfig = device.minerData?.config?.extra_config as Record<string, unknown> | undefined;
    
    // Initialize form state from existing extra_config (preserve all fields)
    const formState: Record<string, unknown> = extraConfig ? { ...extraConfig } : {};

    // Empty schema for default model (no validation constraints)
    const schema: Record<string, unknown> = {
      type: "object",
      additionalProperties: true, // Allow any properties
    };

    return {
      formState,
      jsonSchema: schema,
      
      validate(): { valid: boolean; errors: string[] } {
        // Default model always validates as true (no constraints)
        return { valid: true, errors: [] };
      },
      
      validateField(_fieldName: string): string[] {
        // Default model has no field-level validation
        return [];
      },
      
      toExtraConfig(): Record<string, unknown> {
        // Return all fields from form state (preserve everything)
        const result: Record<string, unknown> = {};
        
        Object.entries(this.formState).forEach(([key, value]) => {
          // Include all fields except undefined (null is allowed)
          if (value !== undefined) {
            result[key] = value;
          }
        });
        
        return result;
      },
      
      updateField<K extends keyof Record<string, unknown>>(field: K, value: unknown): void {
        this.formState[field as string] = value;
      },
      
      getFormState(): Record<string, unknown> {
        return { ...this.formState };
      },

      getExtraConfigFields(): string[] {
        return getExtraConfigFieldsFromSchema(this.jsonSchema);
      },
    };
  }
}
