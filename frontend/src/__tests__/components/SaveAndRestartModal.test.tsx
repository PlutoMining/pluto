import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { SaveAndRestartModal } from "@/components/Modal/SaveAndRestartModal";

describe("SaveAndRestartModal", () => {
  it("defaults to 'only-save' and confirms selection", async () => {
    const onClose = jest.fn();

    render(<SaveAndRestartModal isOpen={true} onClose={onClose} />);
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onClose).toHaveBeenCalledWith("only-save");

    fireEvent.click(screen.getByRole("radio", { name: "Save&Restart" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onClose).toHaveBeenLastCalledWith("save-and-restart");
  });

  it("cancels via cancel button and overlay", async () => {
    const onClose = jest.fn();

    render(<SaveAndRestartModal isOpen={true} onClose={onClose} />);
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledWith("");

    const overlay = dialog.previousElementSibling as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledWith("");
  });
});
