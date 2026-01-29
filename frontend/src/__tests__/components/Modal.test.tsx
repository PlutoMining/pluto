import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <div>content</div>
      </Modal>
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders when open and closes on overlay click", async () => {
    const onClose = jest.fn();

    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    );

    const dialog = await screen.findByRole("dialog");
    expect(screen.getByText("content")).toBeInTheDocument();

    const overlay = dialog.previousElementSibling as HTMLElement;
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const onClose = jest.fn();

    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    );

    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside dialog", async () => {
    const onClose = jest.fn();

    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    );

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });
});
