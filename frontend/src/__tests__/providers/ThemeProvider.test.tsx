import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next-themes", () => ({
  ThemeProvider: jest.fn(({ children }: any) => <div data-testid="next-themes-provider">{children}</div>),
}));

import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeProvider as MockNextThemesProvider } from "next-themes";

describe("ThemeProvider", () => {
  beforeEach(() => {
    (MockNextThemesProvider as unknown as jest.Mock).mockClear();
  });

  it("renders children and configures next-themes", () => {
    render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>
    );

    expect(screen.getByText("content")).toBeInTheDocument();
    expect(MockNextThemesProvider).toHaveBeenCalledTimes(1);

    const props = (MockNextThemesProvider as unknown as jest.Mock).mock.calls[0][0];
    expect(props).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
      disableTransitionOnChange: true,
    });
  });
});
