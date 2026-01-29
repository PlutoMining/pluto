import React from "react";
import { render, screen } from "@testing-library/react";

import Link from "@/components/Link/Link";

describe("Link", () => {
  it("renders a span when disabled", () => {
    render(<Link label="Disabled" href="/x" isDisabled />);

    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders external link with target and rel", () => {
    render(<Link label="External" href="https://example.com" isExternal />);

    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("renders an internal Next.js link when not external", () => {
    render(<Link label="Internal" href="/internal" />);

    const link = screen.getByRole("link", { name: "Internal" });
    expect(link).toHaveAttribute("href", "/internal");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("respects an explicit `as` override", () => {
    render(<Link label="AsAnchor" href="/x" as="a" />);
    const link = screen.getByRole("link", { name: "AsAnchor" });
    expect(link.tagName.toLowerCase()).toBe("a");
  });
});
