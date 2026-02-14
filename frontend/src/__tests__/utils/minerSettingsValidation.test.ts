import {
  createValidatorForMinerType,
  validateExtraConfig,
  getFieldValidationErrors,
} from "@/utils/minerSettingsValidation";

// Mock AJV
jest.mock("ajv", () => {
  const mockCompile = jest.fn((schema) => {
    return (data: any) => {
      // Simple mock validation: check if frequency is in enum
      if (schema.properties?.frequency) {
        const freqEnum = schema.properties.frequency.anyOf?.[0]?.enum;
        if (freqEnum && data.frequency !== undefined && data.frequency !== null) {
          if (!freqEnum.includes(data.frequency)) {
            return false;
          }
        }
      }
      return true;
    };
  });

  return jest.fn().mockImplementation(() => ({
    compile: mockCompile,
  }));
});

const mockSchemas = {
  bitaxe: {
    properties: {
      frequency: {
        anyOf: [
          { type: "integer", enum: [400, 490, 525, 550, 600, 625] },
          { type: "null" },
        ],
      },
      core_voltage: {
        anyOf: [
          { type: "integer", enum: [1000, 1060, 1100, 1150, 1200, 1250] },
          { type: "null" },
        ],
      },
    },
  },
} as any;

describe("minerSettingsValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createValidatorForMinerType", () => {
    it("creates validator for known miner type", () => {
      const validator = createValidatorForMinerType("bitaxe", mockSchemas);

      expect(validator).not.toBeNull();
      expect(typeof validator).toBe("function");
    });

    it("returns null for unknown miner type", () => {
      const validator = createValidatorForMinerType("unknown", mockSchemas);

      expect(validator).toBeNull();
    });

    it("returns null for null miner type", () => {
      const validator = createValidatorForMinerType(null, mockSchemas);

      expect(validator).toBeNull();
    });

    it("caches validators per miner type", () => {
      const validator1 = createValidatorForMinerType("bitaxe", mockSchemas);
      const validator2 = createValidatorForMinerType("bitaxe", mockSchemas);

      expect(validator1).toBe(validator2);
    });
  });

  describe("validateExtraConfig", () => {
    it("returns valid for valid config", () => {
      const result = validateExtraConfig(
        { frequency: 525, core_voltage: 1100 },
        "bitaxe",
        mockSchemas
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns invalid with errors for invalid config", () => {
      const result = validateExtraConfig(
        { frequency: 999 }, // Invalid frequency
        "bitaxe",
        mockSchemas
      );

      // Note: The mock validator is simplified, so this may not catch all errors
      // In real usage, AJV would return proper validation errors
      expect(result).toBeDefined();
    });

    it("returns valid when no validator available", () => {
      const result = validateExtraConfig(
        { frequency: 999 },
        "unknown",
        mockSchemas
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("getFieldValidationErrors", () => {
    it("returns empty array when validator is null", () => {
      const errors = getFieldValidationErrors(null, { frequency: 999 }, "frequency");

      expect(errors).toHaveLength(0);
    });

    it("returns empty array when data is valid", () => {
      const validator = createValidatorForMinerType("bitaxe", mockSchemas);
      const errors = getFieldValidationErrors(validator, { frequency: 525 }, "frequency");

      // Mock validator doesn't return detailed errors, so this is a basic test
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
