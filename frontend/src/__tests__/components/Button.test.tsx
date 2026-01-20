import { render, screen } from "@testing-library/react";
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

  it("maps size variants and renders optional icons", () => {
    const { rerender } = render(
      <Button
        variant="primary"
        onClick={() => {}}
        label="Small"
        size="sm"
        icon={<span data-testid="left" />}
        rightIcon={<span data-testid="right" />}
      />
    );

    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Small" }).className).toContain("h-9");

    rerender(<Button variant="primary" onClick={() => {}} label="Medium" size="md" />);
    expect(screen.getByRole("button", { name: "Medium" }).className).toContain("h-10");

    rerender(<Button variant="primary" onClick={() => {}} label="Large" size="lg" />);
    expect(screen.getByRole("button", { name: "Large" }).className).toContain("h-11");
  });
});
