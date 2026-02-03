import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";

import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  it("tracks window width changes and cleans up listeners", async () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();

    (global as any).matchMedia = () => ({
      matches: false,
      media: "(max-width: 833px)",
      onchange: null,
      addEventListener: (event: string, handler: any) => {
        addEventListener(event, handler);
      },
      removeEventListener: (event: string, handler: any) => {
        removeEventListener(event, handler);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });

    function Demo() {
      return <div>{useIsMobile() ? "mobile" : "desktop"}</div>;
    }

    Object.defineProperty(window, "innerWidth", { value: 500, writable: true });
    const { unmount } = render(<Demo />);

    await waitFor(() => expect(screen.getByText("mobile")).toBeInTheDocument());
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    (window as any).innerWidth = 900;
    const changeHandler = addEventListener.mock.calls.find((call) => call[0] === "change")?.[1] as
      | ((ev: Event) => void)
      | undefined;
    if (changeHandler) {
      await act(async () => {
        changeHandler(new Event("change"));
      });
    }
    await waitFor(() => expect(screen.getByText("desktop")).toBeInTheDocument());

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
