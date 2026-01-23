import React from "react";
import { render, screen } from "@testing-library/react";

import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders input and forwards props", () => {
    render(<Input placeholder="Type" aria-label="the-input" />);

    const el = screen.getByLabelText("the-input");
    expect(el).toHaveAttribute("placeholder", "Type");
  });
});
