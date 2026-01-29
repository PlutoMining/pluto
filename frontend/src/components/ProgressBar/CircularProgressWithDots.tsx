/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React from "react";

export const CircularProgressWithDots = () => {
  return (
    <div className="flex gap-2" aria-label="Loading">
      <span
        className="h-4 w-4 bg-primary motion-safe:animate-pulse motion-reduce:opacity-60"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-4 w-4 bg-primary motion-safe:animate-pulse motion-reduce:opacity-60"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-4 w-4 bg-primary motion-safe:animate-pulse motion-reduce:opacity-60"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
};
