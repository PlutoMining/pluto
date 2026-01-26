import React from "react";
import { render, screen } from "@testing-library/react";

import { DeviceStatusBadge } from "@/components/Badge/DeviceStatusBadge";

describe("DeviceStatusBadge", () => {
  it("renders default online state", () => {
    render(<DeviceStatusBadge />);

    const el = screen.getByText("online");
    expect(el).toHaveClass("border-emerald-500");
    expect(el).toHaveClass("bg-emerald-500/10");
    expect(el).toHaveStyle({ lineHeight: "20px" });
  });

  it("renders offline state with custom label, lineHeight, and invert", () => {
    render(
      <DeviceStatusBadge status="offline" label="down" lineHeight="18px" invert={true} />
    );

    const el = screen.getByText("down");
    expect(el).toHaveClass("border-destructive");
    expect(el).toHaveClass("bg-background");
    expect(el).not.toHaveClass("bg-destructive/10");
    expect(el).toHaveStyle({ lineHeight: "18px" });
  });

  it("renders offline state without invert using the destructive background", () => {
    render(<DeviceStatusBadge status="offline" />);

    const el = screen.getByText("offline");
    expect(el).toHaveClass("border-destructive");
    expect(el).toHaveClass("bg-destructive/10");
    expect(el).not.toHaveClass("bg-background");
  });
});
