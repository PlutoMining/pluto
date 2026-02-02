import React from "react";
import { render } from "@testing-library/react";

import { Skeleton } from "@/components/ui/skeleton";

describe("ui/skeleton", () => {
  it("renders with default pulse styles", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);

    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).not.toBeNull();
    expect(el?.className).toContain("animate-pulse");
    expect(el?.className).toContain("h-4");
  });
});
