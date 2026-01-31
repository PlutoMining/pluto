"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { Select } from "@/components/Select";
import { useTheme } from "next-themes";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";

type ColorMode = "system" | "light" | "dark";

export default function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const [selectedColorMode, setSelectedColorMode] = useState<ColorMode>("system");

  const colorModes = [
    {
      value: "system",
      label: "System Theme",
    },
    {
      value: "dark",
      label: "Dark Theme",
    },
    {
      value: "light",
      label: "Light Theme",
    },
  ];

  useEffect(() => {
    if (theme === "system" || theme === "light" || theme === "dark") {
      setSelectedColorMode(theme);
    }
  }, [theme]);

  const handleColorModeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const next: ColorMode = val === "light" || val === "dark" || val === "system" ? val : "system";
    setSelectedColorMode(next);
    setTheme(next);
  }, [setTheme]);

  return (
    <div className="flex-1 py-6">
      <div className="mx-auto w-full max-w-[var(--pluto-content-max)] px-4 md:px-8">
        <form className="flex flex-col gap-8">
          <div className="flex flex-col gap-6 md:max-w-[640px]">
          <h2 className="font-heading text-lg font-medium uppercase text-muted-foreground">
            System settings
          </h2>
          <Select
            id={"color-mode"}
            label="Theme"
            name="theme"
            onChange={handleColorModeChange}
            value={selectedColorMode}
            optionValues={colorModes}
          />
          </div>
        </form>
      </div>
    </div>
  );
}
