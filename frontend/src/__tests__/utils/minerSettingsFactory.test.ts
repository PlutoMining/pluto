import type { DiscoveredMiner } from "@pluto/interfaces";
import { MinerSettingsFactory } from "@/utils/minerSettingsFactory";

// Mock the generated schemas
jest.mock("@pluto/pyasic-bridge-client", () => ({
  ExtraConfigSchemas: {
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
    espminer: {
      properties: {
        frequency: {
          anyOf: [
            { type: "integer", enum: [400, 490, 525, 550, 600, 625] },
            { type: "null" },
          ],
        },
      },
    },
  },
}));

const makeBitaxeMiner = (overrides?: Partial<DiscoveredMiner>): DiscoveredMiner => ({
  ip: "10.0.0.1",
  mac: "aa:bb:cc:dd:ee:ff",
  type: "Bitaxe Gamma",
  minerData: {
    ip: "10.0.0.1",
    hostname: "bitaxe-1",
    model: "Bitaxe Gamma",
    config: {
      extra_config: {
        frequency: 525,
        core_voltage: 1100,
      },
    },
  } as any,
  ...overrides,
});

describe("MinerSettingsFactory", () => {
  describe("createModelForMiner", () => {
    it("creates Bitaxe model for Bitaxe miner", () => {
      const device = makeBitaxeMiner();
      const model = MinerSettingsFactory.createModelForMiner(device);

      expect(model).not.toBeNull();
      expect(model?.getFormState().frequency).toBe(525);
      expect(model?.getFormState().core_voltage).toBe(1100);
    });

    it("creates Bitaxe model for espminer", () => {
      const device = makeBitaxeMiner({ type: "espminer" });
      const model = MinerSettingsFactory.createModelForMiner(device);

      expect(model).not.toBeNull();
    });

    it("returns default model for unknown miner type", () => {
      const device = makeBitaxeMiner({ type: "Antminer S19" });
      const model = MinerSettingsFactory.createModelForMiner(device);

      expect(model).not.toBeNull();
      // Default model should preserve existing extra_config fields
      expect(model.getFormState()).toEqual(expect.objectContaining({
        frequency: 525,
        core_voltage: 1100,
      }));
    });

    it("default model always validates as true", () => {
      const device = makeBitaxeMiner({ type: "Antminer S19" });
      const model = MinerSettingsFactory.createModelForMiner(device);

      const validation = model.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("default model preserves all extra_config fields", () => {
      const device = makeBitaxeMiner({
        type: "Antminer S19",
        minerData: {
          ...makeBitaxeMiner().minerData,
          config: {
            extra_config: {
              custom_field: "value",
              another_field: 123,
              nested: { data: "test" },
            },
          },
        } as any,
      });

      const model = MinerSettingsFactory.createModelForMiner(device);
      const extraConfig = model.toExtraConfig();

      expect(extraConfig.custom_field).toBe("value");
      expect(extraConfig.another_field).toBe(123);
      expect(extraConfig.nested).toEqual({ data: "test" });
    });

    it("default model allows updating any field", () => {
      const device = makeBitaxeMiner({ type: "Antminer S19" });
      const model = MinerSettingsFactory.createModelForMiner(device);

      model.updateField("custom_field", "new_value");
      model.updateField("numeric_field", 999);

      const extraConfig = model.toExtraConfig();
      expect(extraConfig.custom_field).toBe("new_value");
      expect(extraConfig.numeric_field).toBe(999);
    });

    it("initializes form state from minerData extra_config", () => {
      const device = makeBitaxeMiner({
        minerData: {
          ...makeBitaxeMiner().minerData,
          config: {
            extra_config: {
              frequency: 600,
              core_voltage: 1200,
              rotation: 90,
            },
          },
        } as any,
      });

      const model = MinerSettingsFactory.createModelForMiner(device);

      expect(model?.getFormState().frequency).toBe(600);
      expect(model?.getFormState().core_voltage).toBe(1200);
      expect(model?.getFormState().rotation).toBe(90);
    });
  });

  describe("normalizeMinerType", () => {
    it("normalizes miner type from device.type", () => {
      const device = makeBitaxeMiner({ type: "Bitaxe Gamma" });
      const normalized = MinerSettingsFactory.normalizeMinerType(device);

      // normalizeMinerType now canonicalizes Bitaxe-like miners to "bitaxe"
      expect(normalized).toBe("bitaxe");
    });

    it("falls back to minerData.device_info.model", () => {
      const device = makeBitaxeMiner({
        type: "",
        minerData: {
          ...makeBitaxeMiner().minerData,
          device_info: { model: "Bitaxe Beta" },
        } as any,
      });

      const normalized = MinerSettingsFactory.normalizeMinerType(device);

      // Fallback still detects Bitaxe, but returns canonical type string
      expect(normalized).toBe("bitaxe");
    });
  });

  describe("isBitaxe", () => {
    it("returns true for Bitaxe miners", () => {
      expect(MinerSettingsFactory.isBitaxe("Bitaxe Gamma")).toBe(true);
      expect(MinerSettingsFactory.isBitaxe("bitaxe")).toBe(true);
      expect(MinerSettingsFactory.isBitaxe("espminer")).toBe(true);
    });

    it("returns false for non-Bitaxe miners", () => {
      expect(MinerSettingsFactory.isBitaxe("Antminer S19")).toBe(false);
      expect(MinerSettingsFactory.isBitaxe(null)).toBe(false);
      expect(MinerSettingsFactory.isBitaxe(undefined)).toBe(false);
    });
  });

  describe("MinerSettingsModel", () => {
    it("validates form state", () => {
      const device = makeBitaxeMiner();
      const model = MinerSettingsFactory.createModelForMiner(device);

      expect(model).not.toBeNull();
      const validation = model!.validate();
      expect(validation.valid).toBe(true);
    });

    it("converts form state to extra_config", () => {
      const device = makeBitaxeMiner();
      const model = MinerSettingsFactory.createModelForMiner(device);

      model!.updateField("frequency", 600);
      model!.updateField("core_voltage", 1200);

      const extraConfig = model!.toExtraConfig();

      expect(extraConfig.frequency).toBe(600);
      expect(extraConfig.core_voltage).toBe(1200);
    });

    it("only includes defined fields in extra_config", () => {
      const device = makeBitaxeMiner({
        minerData: {
          ...makeBitaxeMiner().minerData,
          config: {
            extra_config: {},
          },
        } as any,
      });

      const model = MinerSettingsFactory.createModelForMiner(device);
      const extraConfig = model!.toExtraConfig();

      // Should not include undefined fields
      expect(extraConfig).not.toHaveProperty("frequency");
      expect(extraConfig).not.toHaveProperty("core_voltage");
    });
  });
});
