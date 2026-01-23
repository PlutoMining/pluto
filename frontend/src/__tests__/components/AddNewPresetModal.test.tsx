import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../components/PresetEditor", () => {
  return {
    PresetEditor: ({ presetId, onCloseModal, onCloseSuccessfullyModal }: any) => {
      return (
        <div>
          <p>{`PresetEditor presetId: ${presetId ?? ""}`}</p>
          <button type="button" onClick={onCloseModal}>
            mock-close
          </button>
          <button type="button" onClick={onCloseSuccessfullyModal}>
            mock-success
          </button>
        </div>
      );
    },
  };
});

import { AddNewPresetModal } from "@/components/Modal/AddNewPresetModal";

describe("AddNewPresetModal", () => {
  it("renders PresetEditor and forwards callbacks", async () => {
    const onClose = jest.fn();
    const onCloseSuccessfully = jest.fn();

    render(
      <AddNewPresetModal
        isOpen={true}
        onClose={onClose}
        onCloseSuccessfully={onCloseSuccessfully}
        presetId="preset-123"
      />
    );

    await screen.findByRole("dialog");

    expect(screen.getByText("PresetEditor presetId: preset-123")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "mock-success" }));
    expect(onCloseSuccessfully).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
