import React from "react";
import { render, screen } from "@testing-library/react";

import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";

describe("CircularProgressWithDots", () => {
  it("renders 3 pulsing dots with staggered delays", () => {
    const { container } = render(<CircularProgressWithDots />);

    const loading = screen.getByLabelText("Loading");
    expect(loading).toBeInTheDocument();
    expect(loading.className).toContain("flex");

    const dots = container.querySelectorAll("span");
    expect(dots).toHaveLength(3);

    expect(dots[0]).toHaveStyle({ animationDelay: "0ms" });
    expect(dots[1]).toHaveStyle({ animationDelay: "150ms" });
    expect(dots[2]).toHaveStyle({ animationDelay: "300ms" });
  });
});
