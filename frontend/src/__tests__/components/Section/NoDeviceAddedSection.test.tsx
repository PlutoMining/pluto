import { render, screen } from "@testing-library/react";

import { NoDeviceAddedSection } from "@/components/Section";

describe("NoDeviceAddedSection", () => {
  it("renders the empty state message", () => {
    render(<NoDeviceAddedSection />);

    const message = screen.getByText("Start using Pluto adding your first device");
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass("text-sm", "text-foreground");

    const container = message.closest("div");
    expect(container).not.toBeNull();
    expect(container).toHaveClass("flex", "flex-col", "items-center", "gap-4", "text-center");
  });

  it("links to the devices page", () => {
    render(<NoDeviceAddedSection />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/devices");

    const button = screen.getByRole("button", { name: 'Go to "Your Devices"' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary");
  });
});
