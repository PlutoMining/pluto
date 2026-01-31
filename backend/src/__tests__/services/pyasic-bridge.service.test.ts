import axios from "axios";

import { pyasicBridgeClient } from "@/services/pyasic-bridge.service";

jest.mock("@/config/environment", () => ({
  config: { pyasicBridgeHost: "http://pyasic-bridge.test///" },
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@pluto/logger", () => ({
  logger: { info: jest.fn() },
}));

const mockAxiosPost = axios.post as jest.Mock;
const mockAxiosPatch = axios.patch as jest.Mock;

describe("pyasic-bridge.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosPost.mockResolvedValue(undefined);
    mockAxiosPatch.mockResolvedValue(undefined);
  });

  describe("restartMiner", () => {
    it("POSTs to /miner/:ip/restart and logs", async () => {
      await pyasicBridgeClient.restartMiner("192.168.1.10");

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      // baseUrl is stripped of trailing slashes in constructor
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "http://pyasic-bridge.test/miner/192.168.1.10/restart"
      );
    });
  });

  describe("updateMinerConfig", () => {
    it("PATCHes to /miner/:ip/config with payload and logs", async () => {
      const payload = { power: 100, fan: 80 };
      await pyasicBridgeClient.updateMinerConfig("192.168.1.20", payload);

      expect(mockAxiosPatch).toHaveBeenCalledTimes(1);
      expect(mockAxiosPatch).toHaveBeenCalledWith(
        "http://pyasic-bridge.test/miner/192.168.1.20/config",
        payload
      );
    });

    it("handles empty payload and logs payloadKeys", async () => {
      await pyasicBridgeClient.updateMinerConfig("10.0.0.2", {});

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        "http://pyasic-bridge.test/miner/10.0.0.2/config",
        {}
      );
    });

    it("handles falsy payload defensively (payloadKeys)", async () => {
      await pyasicBridgeClient.updateMinerConfig("10.0.0.3", null as unknown as Record<string, unknown>);

      expect(mockAxiosPatch).toHaveBeenCalledWith(
        "http://pyasic-bridge.test/miner/10.0.0.3/config",
        null
      );
    });
  });
});
