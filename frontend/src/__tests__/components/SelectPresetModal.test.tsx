import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import type { DiscoveredMiner, Preset } from "@pluto/interfaces";
import { SelectPresetModal } from "@/components/Modal/SelectPresetModal";

const buildDiscoveredMiner = (overrides: Partial<DiscoveredMiner> = {}): DiscoveredMiner => {
  return {
    mac: "aa:bb:cc:dd:ee:ff",
    ip: "192.168.0.10",
    type: "Bitaxe",
    tracing: true,
    presetUuid: null,
    minerData: {
      ip: "192.168.0.10",
      hostname: "miner-01",
      device_info: {
        model: "BM1397",
      },
      config: {
        pools: {
          groups: [
            {
              pools: [
                {
                  url: "stratum+tcp://pool.example.com:3333",
                  user: "user",
                  password: "",
                },
              ],
            },
          ],
        },
      },
    },
    ...overrides,
  };
};

const buildPreset = (uuid: string, name: string): Preset => {
  return { uuid, name } as unknown as Preset;
};

describe("SelectPresetModal", () => {
  it("defaults to first preset and calls onCloseSuccessfully with selected preset", async () => {
    const onClose = jest.fn();
    const onCloseSuccessfully = jest.fn();
    const devices = [buildDiscoveredMiner()];
    const presets = [buildPreset("p1", "One"), buildPreset("p2", "Two")];

    render(
      <SelectPresetModal
        isOpen={true}
        onClose={onClose}
        devices={devices}
        presets={presets}
        onCloseSuccessfully={onCloseSuccessfully}
      />
    );

    await screen.findByRole("dialog");

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("p1");

    fireEvent.change(select, { target: { value: "p2" } });
    expect(select.value).toBe("p2");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onCloseSuccessfully).toHaveBeenCalledWith("p2");
  });

  it("does not call onCloseSuccessfully when presets is empty", async () => {
    const onClose = jest.fn();
    const onCloseSuccessfully = jest.fn();

    render(
      <SelectPresetModal
        isOpen={true}
        onClose={onClose}
        devices={[buildDiscoveredMiner({ tracing: false })]}
        presets={[]}
        onCloseSuccessfully={onCloseSuccessfully}
      />
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onCloseSuccessfully).not.toHaveBeenCalled();
  });
});
