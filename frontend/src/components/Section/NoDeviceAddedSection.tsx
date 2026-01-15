/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import NextLink from "next/link";
import React from "react";

import { Button } from "@/components/ui/button";

interface NoDeviceAddedSectionProps {}

export const NoDeviceAddedSection: React.FC<NoDeviceAddedSectionProps> = ({}) => {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-foreground">Start using Pluto adding your first device</p>
      <NextLink href="/devices">
        <Button variant="primary">Go to "Your Devices"</Button>
      </NextLink>
    </div>
  );
};
