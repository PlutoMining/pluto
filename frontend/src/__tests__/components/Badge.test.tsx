import React from "react";
import { render, screen } from "@testing-library/react";

import { Badge } from "@/components/Badge/Badge";

describe("Badge", () => {
  it("renders label and maps text color", () => {
    render(<Badge label="online" color="primary-color" />);

    const el = screen.getByText("online");
    expect(el).toHaveClass("text-primary");
    expect(el).toHaveClass("bg-muted");
  });

  it("applies fontWeight", () => {
    render(<Badge label="x" fontWeight="700" />);

    expect(screen.getByText("x")).toHaveStyle({ fontWeight: "700" });
  });

  it("maps background and fallback text color", () => {
    render(
      <div>
        <Badge label="a" bg="dashboard-badge-bg" color="body-text" />
        <Badge label="b" bg="badge-bg" color="other" />
        <Badge label="c" bg="something-else" color="other" />
      </div>
    );

    expect(screen.getByText("a")).toHaveClass("bg-muted");
    expect(screen.getByText("a")).toHaveClass("text-foreground");
    expect(screen.getByText("b")).toHaveClass("bg-muted");
    expect(screen.getByText("c")).toHaveClass("bg-muted");
  });
});
