import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { BasicModal } from "@/components/Modal/BasicModal";

describe("BasicModal", () => {
  it("renders title/body and calls actions", async () => {
    const onClose = jest.fn();
    const primaryAction = jest.fn();

    render(
      <BasicModal
        isOpen={true}
        onClose={onClose}
        title="Title"
        body="Body"
        primaryAction={primaryAction}
        primaryActionLabel="Confirm"
        secondaryActionLabel="Cancel"
      />
    );

    await screen.findByRole("dialog");

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(primaryAction).toHaveBeenCalledTimes(1);

    // secondaryActionLabel without secondaryAction should fall back to onClose
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("omits optional body and secondary action", async () => {
    const onClose = jest.fn();
    const primaryAction = jest.fn();

    render(
      <BasicModal
        isOpen={true}
        onClose={onClose}
        title="Title"
        primaryAction={primaryAction}
        primaryActionLabel="Confirm"
      />
    );

    await screen.findByRole("dialog");
    expect(screen.queryByText("Body")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(primaryAction).toHaveBeenCalledTimes(1);
  });
});
