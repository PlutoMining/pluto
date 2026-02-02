import React from "react";
import { render, screen } from "@testing-library/react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

describe("ui/sheet", () => {
  it("renders close button by default", () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
          <div>Body</div>
        </SheetContent>
      </Sheet>
    );

    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("close")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("supports side variants and hiding the close button", () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent side="left" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
          <div>Body</div>
        </SheetContent>
      </Sheet>
    );

    const content = document.querySelector('[data-slot="sheet-content"]');
    expect(content).not.toBeNull();
    expect((content as HTMLElement).className).toContain("slide-in-from-left");
    expect(screen.queryByText("Close")).toBeNull();
  });
});
