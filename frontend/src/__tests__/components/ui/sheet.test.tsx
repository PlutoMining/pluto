import React from "react";
import { render, screen } from "@testing-library/react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPortal,
  SheetTrigger,
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

  it("covers trigger/close helpers and other side variants", () => {
    render(
      <>
        <Sheet open onOpenChange={() => {}}>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent side="top">
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
              <SheetDescription>Desc</SheetDescription>
            </SheetHeader>
            <SheetClose>Close inner</SheetClose>
          </SheetContent>
        </Sheet>

        <Sheet open onOpenChange={() => {}}>
          <SheetPortal>
            <div data-testid="portal-child">Portal</div>
          </SheetPortal>
          <SheetContent side="bottom" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
              <SheetDescription>Desc</SheetDescription>
            </SheetHeader>
            <div>Body</div>
          </SheetContent>
        </Sheet>
      </>
    );

    const contents = Array.from(document.querySelectorAll('[data-slot="sheet-content"]')) as HTMLElement[];
    expect(contents.some((el) => el.className.includes("slide-in-from-top"))).toBe(true);
    expect(contents.some((el) => el.className.includes("slide-in-from-bottom"))).toBe(true);
    expect(screen.getByTestId("portal-child")).toBeInTheDocument();
    expect(screen.getByText("Close inner")).toBeInTheDocument();
  });
});
