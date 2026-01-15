/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  const internalApiRoutes = ["/api/app-version", "/api/socket/io"];

  // Handling requests to the backend API
  if (url.pathname.startsWith("/api")) {
    // Check if the route is in the list of internal routes
    const isInternalRoute = internalApiRoutes.some((route) => url.pathname.startsWith(route));

    if (!isInternalRoute) {
      const backendHost = process.env.BACKEND_DESTINATION_HOST;
      if (backendHost) {
        // Remove "/api" from the destination path
        const strippedPath = url.pathname.replace("/api", "");
        const apiUrl = new URL(`${backendHost}${strippedPath}${url.search}`);
        return NextResponse.rewrite(apiUrl);
      } else {
        console.error("Error: BACKEND_DESTINATION_HOST is not defined");
        return NextResponse.next(); // Or return a custom error response
      }
    }
  }

  // If no condition is met, proceed normally
  return NextResponse.next();
}

// Matcher configuration to handle both routes
export const config = {
  matcher: ["/api/:path*"],
  dynamic: "force-dynamic",
};
