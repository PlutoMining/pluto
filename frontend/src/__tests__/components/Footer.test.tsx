import React from "react";
import { render, screen } from "@testing-library/react";

import { Footer } from "@/components/Footer/Footer";

describe("Footer", () => {
  it("renders links and attribution", () => {
    const { container } = render(<Footer />);

    expect(screen.getByText("Designed with love by")).toBeInTheDocument();
    expect(screen.getByText("Terms & Conditions")).toBeInTheDocument();

    const githubLink = container.querySelector('a[href="https://github.com/PlutoMining/pluto"]');
    expect(githubLink).not.toBeNull();
    expect(githubLink).toHaveAttribute("target", "_blank");

    const discordLink = container.querySelector('a[href="https://discord.gg/osmu"]');
    expect(discordLink).not.toBeNull();
    expect(discordLink).toHaveAttribute("target", "_blank");

    const loadoutLink = container.querySelector('a[href="https://www.loadout.gg/"]');
    expect(loadoutLink).not.toBeNull();
    expect(loadoutLink).toHaveAttribute("target", "_blank");
  });
});
