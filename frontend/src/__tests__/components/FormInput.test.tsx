import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Input } from "@/components/Input/Input";

describe("Form Input", () => {
  it("renders label and addons and forwards state", () => {
    const onChange = jest.fn();
    const { container } = render(
      <Input
        label="Name"
        name="name"
        id="name"
        placeholder="Type"
        leftAddon="http://"
        rightAddon=".com"
        onChange={onChange}
      />
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("http://")).toBeInTheDocument();
    expect(screen.getByText(".com")).toBeInTheDocument();

    const input = container.querySelector("input#name") as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders error state and disabled state", () => {
    const { container } = render(
      <Input
        name="password"
        id="password"
        type="password"
        error="Required"
        rightAddon="!"
        isDisabled={true}
      />
    );

    expect(screen.getByText("Required")).toBeInTheDocument();

    const input = container.querySelector("input#password") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");

    const rightAddon = screen.getByText("!");
    expect(rightAddon.className).toContain("opacity-60");
    expect(rightAddon.className).toContain("border-destructive");
  });
});
