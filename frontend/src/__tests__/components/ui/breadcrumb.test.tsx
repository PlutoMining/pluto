import React from "react";
import { render, screen } from "@testing-library/react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

describe("ui/breadcrumb", () => {
  it("renders default separator icon and page semantics", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/a">A</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Here</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(screen.getByLabelText("breadcrumb")).toHaveAttribute("data-slot", "breadcrumb");
    expect(screen.getByText("chevron_right")).toBeInTheDocument();
    expect(screen.getByText("more_horiz")).toBeInTheDocument();

    const page = screen.getByText("Here");
    expect(page).toHaveAttribute("role", "link");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveAttribute("aria-disabled", "true");
  });

  it("supports BreadcrumbLink asChild", () => {
    render(
      <BreadcrumbLink asChild>
        <a href="/x">Go</a>
      </BreadcrumbLink>
    );

    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/x");
  });
});
