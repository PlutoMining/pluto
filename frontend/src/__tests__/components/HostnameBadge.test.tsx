import React from "react";
import { render, screen } from "@testing-library/react";

import { HostnameBadge } from "@/components/Badge/HostnameBadge";

describe("HostnameBadge", () => {
  it("renders an enabled external link and prefixes protocol when missing", () => {
    render(<HostnameBadge mac="aa" hostname="miner-01" ip="10.0.0.5" tracing={true} />);

    expect(screen.getByText("miner-01")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "10.0.0.5" });
    expect(link).toHaveAttribute("href", "http://10.0.0.5");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("uses the provided href when the IP already includes a protocol", () => {
    render(
      <HostnameBadge mac="bb" hostname="miner-02" ip="https://10.0.0.6" tracing={true} />
    );

    const link = screen.getByRole("link", { name: "https://10.0.0.6" });
    expect(link).toHaveAttribute("href", "https://10.0.0.6");
  });

  it("renders disabled link as text when tracing is false", () => {
    render(<HostnameBadge mac="cc" hostname="miner-03" ip="10.0.0.7" tracing={false} />);

    expect(screen.queryByRole("link", { name: "10.0.0.7" })).toBeNull();

    const disabled = screen.getByText("10.0.0.7");
    expect(disabled.tagName).toBe("SPAN");
    expect(disabled).toHaveClass("opacity-60");
  });
});
