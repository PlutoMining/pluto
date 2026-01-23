import { render, screen } from "@testing-library/react";

import { Button } from "@/components/ui/button";

describe("ui/Button", () => {
  it("renders a native button by default", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" })).toBeInTheDocument();
  });

  it("supports asChild", () => {
    render(
      <Button asChild>
        <a href="/x">Go</a>
      </Button>
    );

    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/x");
  });
});
