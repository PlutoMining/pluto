import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { NavBar } from "@/components/NavBar/NavBar";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const navigation = jest.requireMock("next/navigation") as { usePathname: jest.Mock };
const axiosMock = jest.requireMock("axios").default as { get: jest.Mock };

describe("NavBar", () => {
  beforeEach(() => {
    navigation.usePathname.mockReturnValue("/");
    axiosMock.get.mockResolvedValue({ data: { version: "1.2.3" } });
  });

  it("renders primary links and fetches app version", async () => {
    const { container } = render(<NavBar />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Monitoring" })).toHaveAttribute("href", "/monitoring");
    expect(screen.getByRole("link", { name: "Device settings" })).toHaveAttribute("href", "/device-settings");
    expect(screen.getByRole("link", { name: "Pool presets" })).toHaveAttribute("href", "/presets");
    expect(screen.getByRole("link", { name: "Your devices" })).toHaveAttribute("href", "/devices");

    expect(axiosMock.get).toHaveBeenCalledWith("/api/app-version");
    expect(await screen.findByText("v.1.2.3")).toBeInTheDocument();

    // version text should appear only when resolved
    expect(container.querySelector("header")).not.toBeNull();
  });

  it("highlights the active route based on pathname", async () => {
    navigation.usePathname.mockReturnValue("/monitoring/abc");

    render(<NavBar />);
    await screen.findByText("v.1.2.3");

    const monitoringLink = screen.getByRole("link", { name: "Monitoring" });
    const overviewLink = screen.getByRole("link", { name: "Overview" });

    expect(monitoringLink).toHaveClass("text-foreground");
    expect(overviewLink).toHaveClass("text-muted-foreground");
  });

  it("toggles the mobile menu and closes when clicking outside", async () => {
    render(<NavBar />);
    await screen.findByText("v.1.2.3");

    const toggleButton = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(toggleButton);
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    expect(screen.getByText("Terms & Conditions")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.queryByText("Terms & Conditions")).toBeNull();
  });

  it("closes the mobile menu when a slide-out link is clicked", async () => {
    render(<NavBar />);
    await screen.findByText("v.1.2.3");

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    // Two links exist when the slide-out is open (desktop nav + mobile slide-out)
    const monitoringLinks = screen.getAllByRole("link", { name: "Monitoring" });
    fireEvent.click(monitoringLinks[1]);

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.queryByText("Terms & Conditions")).toBeNull();
  });

  it("defaults pathname to '/' when next/navigation returns nullish", async () => {
    navigation.usePathname.mockReturnValue(undefined);

    render(<NavBar />);
    await screen.findByText("v.1.2.3");

    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).toHaveClass("text-foreground");
  });
});
