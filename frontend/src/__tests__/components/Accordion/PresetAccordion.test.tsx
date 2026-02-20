import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { PresetAccordion } from "@/components/Accordion/PresetAccordion";

describe("PresetAccordion", () => {
  it("renders empty associated devices state and fires callbacks", () => {
    const duplicateHandler = jest.fn();
    const onDuplicate = jest.fn(() => duplicateHandler);
    const onDelete = jest.fn();

    const preset = {
      uuid: "p1",
      name: "My preset",
      configuration: {
        stratumURL: "pool.example.com",
        stratumPort: 3333,
        stratumUser: "user",
      },
      associatedDevices: [],
    } as any;

    render(
      <PresetAccordion
        preset={preset}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        index={0}
        isDuplicateDisabled={false}
      />
    );

    // onDuplicate is invoked during render (returns the actual handler).
    expect(onDuplicate).toHaveBeenCalledWith("p1");
    expect(screen.getByText("No associated device")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(duplicateHandler).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("p1");
  });

  it("disables delete when devices are associated", () => {
    const duplicateHandler = jest.fn();
    const onDuplicate = jest.fn(() => duplicateHandler);
    const onDelete = jest.fn();

    const preset = {
      uuid: "p2",
      name: "Preset with devices",
      // Use pyasic-style MinerConfigModelInput pool config; the component only
      // cares that a pool entry exists, not about the exact values.
      configuration: {
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
      // Associated devices now follow the DiscoveredMiner shape (pyasic MinerData).
      associatedDevices: [
        {
          mac: "aa",
          ip: "10.0.0.1",
          tracing: true,
          minerData: { hostname: "miner-01" },
        },
        {
          mac: "bb",
          ip: "10.0.0.2",
          // intentionally omit tracing to cover `device.tracing || false`
          minerData: { hostname: "miner-02" },
        },
      ],
    } as any;

    render(
      <PresetAccordion
        preset={preset}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        index={0}
        isDuplicateDisabled={false}
      />
    );

    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("miner-02")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
