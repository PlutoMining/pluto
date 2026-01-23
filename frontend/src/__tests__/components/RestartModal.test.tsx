import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { RestartModal } from "@/components/Modal/RestartModal";

describe("RestartModal", () => {
  it("calls onClose with false/true for cancel/restart", async () => {
    const onClose = jest.fn();

    render(<RestartModal isOpen={true} onClose={onClose} />);

    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("closes via overlay click", async () => {
    const onClose = jest.fn();

    render(<RestartModal isOpen={true} onClose={onClose} />);

    const dialog = await screen.findByRole("dialog");
    const overlay = dialog.previousElementSibling as HTMLElement;

    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
