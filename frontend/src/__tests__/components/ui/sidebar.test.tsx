import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: jest.fn(),
}));

const useIsMobileMock = jest.requireMock("@/hooks/use-mobile").useIsMobile as jest.Mock;

describe("ui/sidebar", () => {
  beforeEach(() => {
    useIsMobileMock.mockReturnValue(false);
    document.cookie = "";
  });

  it("throws if useSidebar is used outside SidebarProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    function Consumer() {
      useSidebar();
      return null;
    }

    expect(() => render(<Consumer />)).toThrow("useSidebar must be used within a SidebarProvider.");

    consoleError.mockRestore();
  });

  it("toggles expanded/collapsed via trigger and persists cookie", () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <SidebarTrigger />
        <div />
      </SidebarProvider>
    );

    const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]');
    expect(wrapper).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(wrapper).toHaveAttribute("data-state", "collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
  });

  it("supports keyboard shortcut (ctrl/meta + b)", () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <div />
      </SidebarProvider>
    );

    const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]');
    expect(wrapper).toHaveAttribute("data-state", "expanded");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(wrapper).toHaveAttribute("data-state", "collapsed");
  });

  it("renders non-collapsible sidebar branch", () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="none">
          <SidebarHeader>Header</SidebarHeader>
          <SidebarSeparator />
          <SidebarContent>Content</SidebarContent>
          <SidebarFooter>Footer</SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).not.toBeNull();
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders mobile sheet branch and closes on menu click", () => {
    useIsMobileMock.mockReturnValue(true);

    render(
      <SidebarProvider defaultOpen>
        <SidebarTrigger />
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Tip">Item</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );

    // Open the mobile sidebar
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(document.querySelector('[data-mobile="true"]')).not.toBeNull();

    // Clicking a menu button should close the mobile sheet
    fireEvent.click(screen.getByRole("button", { name: "Item" }));

    return waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeNull();
    });
  });

  it("renders the rest of sidebar building blocks", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar variant="floating" collapsible="icon">
          <SidebarRail />
          <SidebarHeader>
            <SidebarGroup>
              <SidebarGroupLabel>Group</SidebarGroupLabel>
              <SidebarGroupAction>Act</SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>Active</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarHeader>
        </Sidebar>
        <SidebarInset>Inset</SidebarInset>
      </SidebarProvider>
    );

    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText("Inset")).toBeInTheDocument();
  });

  it("renders menu skeleton with and without icon", () => {
    const { container, rerender } = render(<SidebarMenuSkeleton />);
    expect(container.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeNull();

    rerender(<SidebarMenuSkeleton showIcon />);
    expect(container.querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeNull();
  });

  it("covers remaining sidebar exports/branches", () => {
    useIsMobileMock.mockReturnValue(false);

    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarTrigger />
        <Sidebar side="right" variant="inset" collapsible="offcanvas">
          <SidebarRail />
          <SidebarHeader>
            <SidebarInput placeholder="Search" />
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <span>Group</span>
              </SidebarGroupLabel>
              <SidebarGroupAction asChild>
                <button type="button">Action</button>
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      variant="outline"
                      size="lg"
                      tooltip={{ children: "Tooltip", side: "right" }}
                    >
                      With tooltip
                    </SidebarMenuButton>
                    <SidebarMenuBadge>9</SidebarMenuBadge>
                    <SidebarMenuAction showOnHover>
                      <span>...</span>
                    </SidebarMenuAction>

                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton href="/sub" isActive>
                          <span>Sub</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild href="/sub2">
                          <a href="/sub2">Sub2</a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href="/x">AsChild link</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarMenuSkeleton showIcon />
          </SidebarContent>
          <SidebarFooter>Footer</SidebarFooter>
        </Sidebar>
        <SidebarInset>Inset</SidebarInset>
      </SidebarProvider>
    );

    expect(screen.getByRole("link", { name: "AsChild link" })).toHaveAttribute("href", "/x");
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByText("Inset")).toBeInTheDocument();
  });
});
