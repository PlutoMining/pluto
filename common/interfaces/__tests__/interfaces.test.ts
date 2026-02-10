import { DeviceApiVersion } from "../index";

describe("@pluto/interfaces", () => {
  it("exports DeviceApiVersion enum values", () => {
    expect(DeviceApiVersion.Legacy).toBe("legacy");
    expect(DeviceApiVersion.New).toBe("new");
  });
});
