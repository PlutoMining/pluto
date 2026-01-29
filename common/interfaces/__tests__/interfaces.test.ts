import { DeviceFrequencyOptions, DeviceVoltageOptions } from "../index";

describe("@pluto/interfaces", () => {
  it("exports frequency options for known ASIC models", () => {
    expect(DeviceFrequencyOptions.BM1397).toBeDefined();
    expect(Array.isArray(DeviceFrequencyOptions.BM1397)).toBe(true);

    const defaultOption = DeviceFrequencyOptions.BM1397.find((opt) =>
      opt.label.includes("default"),
    );

    expect(defaultOption).toEqual({ label: "425 (default)", value: 425 });
  });

  it("exports voltage options for known ASIC models", () => {
    expect(DeviceVoltageOptions.BM1370).toBeDefined();
    expect(Array.isArray(DeviceVoltageOptions.BM1370)).toBe(true);

    const defaultOption = DeviceVoltageOptions.BM1370.find((opt) =>
      opt.label.includes("default"),
    );

    expect(defaultOption).toEqual({ label: "1150 (default)", value: 1150 });
  });
});
