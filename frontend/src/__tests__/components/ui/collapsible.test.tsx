import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

describe("ui/collapsible", () => {
  it("toggles content open/closed", () => {
    const { container } = render(
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent forceMount>Content</CollapsibleContent>
      </Collapsible>
    );

    const content = container.querySelector('[data-slot="collapsible-content"]');
    expect(content).not.toBeNull();

    fireEvent.click(screen.getByText("Toggle"));
    // Radix sets data-state on both trigger and content; just ensure it moves away from the initial value.
    expect(content?.getAttribute("data-state")).toBe("open");

    fireEvent.click(screen.getByText("Toggle"));
    expect(content?.getAttribute("data-state")).toBe("closed");
  });
});
