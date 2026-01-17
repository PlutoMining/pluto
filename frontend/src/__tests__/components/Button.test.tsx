import { render, screen } from "@testing-library/react";

import Button from "@/components/Button/Button";

describe("Button", () => {
  it("defaults to type=button to avoid unintended form submits", () => {
    render(<Button variant="primary" onClick={() => {}} label="Click" />);
    expect(screen.getByRole("button", { name: "Click" })).toHaveAttribute("type", "button");
  });

  it("respects an explicit type prop", () => {
    render(<Button variant="primary" type="submit" onClick={() => {}} label="Submit" />);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit");
  });
});

