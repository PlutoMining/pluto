import { render, screen } from "@testing-library/react";

import { Icon } from "@/components/Icon";

describe("Icon", () => {
  it("renders as decorative by default", () => {
    const { container } = render(<Icon name="search" />);
    const el = container.querySelector("span.material-symbols-outlined");
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("renders with an accessible label when provided", () => {
    render(<Icon name="search" label="Search" />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("applies variations", () => {
    const { container } = render(
      <Icon name="search" size={24} fill={1} weight={600} grade={200} opticalSize={48} />
    );
    const el = container.querySelector("span.material-symbols-outlined") as HTMLSpanElement;
    expect(el.style.fontSize).toBe("24px");
    expect(el.style.fontVariationSettings).toContain('"FILL" 1');
    expect(el.style.fontVariationSettings).toContain('"wght" 600');
    expect(el.style.fontVariationSettings).toContain('"GRAD" 200');
    expect(el.style.fontVariationSettings).toContain('"opsz" 48');
  });
});
