import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import SettingsClient from "@/app/(static)/settings/SettingsClient";

jest.mock("axios");

jest.mock("next-themes", () => ({
  __esModule: true,
  useTheme: jest.fn(),
}));

jest.mock("@/components/Select", () => ({
  __esModule: true,
  Select: ({ label, value, onChange, optionValues }: any) => (
    <label>
      {label}
      <select data-testid="select" value={value} onChange={onChange}>
        {optionValues.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="invalid">Invalid</option>
      </select>
    </label>
  ),
}));

const themes = jest.requireMock("next-themes") as { useTheme: jest.Mock };
const axiosMock = axios as jest.Mocked<typeof axios>;

describe("SettingsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    themes.useTheme.mockReturnValue({ theme: "system", setTheme: jest.fn() });
    axiosMock.get.mockResolvedValue({
      data: { data: { enabled: false, channels: [] } },
    });
  });

  it("syncs state from a valid theme", async () => {
    const setTheme = jest.fn();
    themes.useTheme.mockReturnValue({ theme: "dark", setTheme });

    render(<SettingsClient />);

    await waitFor(() => {
      const themeSelects = screen.getAllByTestId("select");
      expect((themeSelects[0] as HTMLSelectElement).value).toBe("dark");
    });
  });

  it("falls back to system for unknown themes and unknown selects", async () => {
    const setTheme = jest.fn();
    themes.useTheme.mockReturnValue({ theme: "unknown", setTheme });

    render(<SettingsClient />);

    await waitFor(() => expect(axiosMock.get).toHaveBeenCalled());

    const themeSelects = screen.getAllByTestId("select");
    expect((themeSelects[0] as HTMLSelectElement).value).toBe("system");

    fireEvent.change(themeSelects[0], { target: { value: "light" } });
    expect(setTheme).toHaveBeenCalledWith("light");

    fireEvent.change(themeSelects[0], { target: { value: "invalid" } });
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  describe("Notifications", () => {
    it("loads notification settings on mount", async () => {
      render(<SettingsClient />);

      await waitFor(() => {
        expect(axiosMock.get).toHaveBeenCalledWith("/api/settings/notifications");
      });
    });

    it("saves notification settings on Save click", async () => {
      axiosMock.put.mockResolvedValue({ data: { data: { enabled: false, channels: [] } } });

      render(<SettingsClient />);
      await waitFor(() => expect(axiosMock.get).toHaveBeenCalled());

      const saveButton = screen.getByRole("button", { name: /^Save$/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(axiosMock.put).toHaveBeenCalledWith(
          "/api/settings/notifications",
          expect.objectContaining({
            enabled: false,
            channels: expect.any(Array),
          })
        );
      });
    });

    it("sends test notification on Test click", async () => {
      axiosMock.post.mockResolvedValue({});

      render(<SettingsClient />);
      await waitFor(() => expect(axiosMock.get).toHaveBeenCalled());

      const testButton = screen.getByRole("button", { name: /^Test$/ });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(axiosMock.post).toHaveBeenCalledWith("/api/settings/notifications/test");
      });
    });
  });
});
