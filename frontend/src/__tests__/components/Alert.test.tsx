import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import Alert from "@/components/Alert/Alert";
import { AlertStatus } from "@/components/Alert/interfaces";

describe("Alert", () => {
  const baseProps = {
    onOpen: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <Alert
        {...baseProps}
        isOpen={false}
        content={{ status: AlertStatus.SUCCESS, title: "Title", message: "Message" }}
      />
    );

    expect(screen.queryByText("Title")).not.toBeInTheDocument();
  });

  it("renders different variants and allows closing", () => {
    const { container, rerender } = render(
      <Alert
        {...baseProps}
        isOpen={true}
        content={{ status: AlertStatus.ERROR, title: "Error", message: "Boom" }}
      />
    );

    expect(screen.getByText("Error")).toBeInTheDocument();

    const card = container.querySelector("div.relative.border") as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.className).toContain("border-destructive");

    const closeSvg = container.querySelector("div.absolute.right-2.top-2 svg") as SVGSVGElement;
    expect(closeSvg).not.toBeNull();
    fireEvent.click(closeSvg);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Alert
        {...baseProps}
        isOpen={true}
        content={{ status: AlertStatus.SUCCESS, title: "Success", message: "OK" }}
      />
    );
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect((container.querySelector("div.relative.border") as HTMLElement).className).toContain("border-emerald-500");

    rerender(
      <Alert
        {...baseProps}
        isOpen={true}
        content={{ status: AlertStatus.WARNING, title: "Warning", message: "Careful" }}
      />
    );
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect((container.querySelector("div.relative.border") as HTMLElement).className).toContain("border-amber-500");
  });

  it("falls back to default variant for unexpected status", () => {
    const { container } = render(
      <Alert
        {...baseProps}
        isOpen={true}
        content={{ status: "other" as any, title: "Other", message: "..." }}
      />
    );

    const card = container.querySelector("div.relative.border") as HTMLElement;
    expect(card.className).toContain("border-border");
  });
});
