import { fireEvent, render, screen } from "@testing-library/react";

import { AppShell } from "@/components/AppShell";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const navigation = jest.requireMock("next/navigation") as { usePathname: jest.Mock };
const themes = jest.requireMock("next-themes") as { useTheme: jest.Mock };
const axiosMock = jest.requireMock("axios").default as { get: jest.Mock };

describe("AppShell", () => {
  beforeEach(() => {
    navigation.usePathname.mockReturnValue("/");
    themes.useTheme.mockReturnValue({ resolvedTheme: "dark" });
    axiosMock.get.mockResolvedValue({ data: { version: "1.2.3" } });
  });

  it("renders sidebar nav and header title", async () => {
    const { container } = render(
      <AppShell>
        <div>child</div>
      </AppShell>
    );

    expect(screen.getByText("Overview Dashboard")).toBeInTheDocument();

    // Nav label stays short (avoid breadcrumb page which uses role="link")
    const overviewCandidates = await screen.findAllByRole("link", { name: /overview/i });
    const overviewNavLink = overviewCandidates.find(
      (el) => el.tagName.toLowerCase() === "a" && el.getAttribute("href") === "/"
    );
    expect(overviewNavLink).toBeTruthy();

    // Version fetched
    expect(axiosMock.get).toHaveBeenCalledWith("/api/app-version");
    expect(await screen.findByText("v.1.2.3")).toBeInTheDocument();

    // Sidebar collapses via trigger
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]');
    expect(wrapper).toHaveAttribute("data-state", "collapsed");

    // Collapsed state doesn't show the footer copy
    expect(screen.queryByText("Designed with love by")).toBeNull();

    // Notification drawer opens
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("No notifications yet.")).toBeInTheDocument();

    // Close drawer
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
  });

  it("uses light wordmark color in light theme", async () => {
    themes.useTheme.mockReturnValue({ resolvedTheme: "light" });

    const { container } = render(
      <AppShell>
        <div>child</div>
      </AppShell>
    );

    // PlutoLogo renders with the provided wordmark color; in light theme we pass #090B0D
    expect(container.innerHTML).toContain("#090B0D");
  });
});
