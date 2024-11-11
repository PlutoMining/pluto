import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  const internalApiRoutes = ["/api/app-version"];

  // Function to ensure each URL segment has a trailing slash
  const ensureTrailingSlash = (str: string) => (str.endsWith("/") ? str : `${str}/`);

  // Handling requests to Grafana
  if (url.pathname.startsWith("/grafana")) {
    const grafanaUrl = new URL(
      `${ensureTrailingSlash(process.env.GF_HOST!)}${url.pathname}`,
      req.url
    );

    // Create the response by rewriting the URL
    const response = NextResponse.rewrite(grafanaUrl);

    if (!url.pathname.startsWith("/grafana/public-dashboards")) {
      // Add custom headers for requests to Grafana
      response.headers.set("X-WEBAUTH-USER", "admin");
    }

    // Add header to allow iframe loading
    response.headers.set("X-Frame-Options", "ALLOWALL");

    // Set Content-Security-Policy to allow iframes from any origin
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self' *;");

    if (url.pathname.includes("/api") && !url.pathname.includes("api/user/auth-tokens/rotate")) {
      response.headers.set("Origin", process.env.GF_HOST!);
    }

    return response;
  }

  // Handling requests to the backend API
  if (url.pathname.startsWith("/api")) {
    // Check if the route is in the list of internal routes
    const isInternalRoute = internalApiRoutes.some((route) => url.pathname.startsWith(route));

    if (!isInternalRoute) {
      const backendHost = process.env.BACKEND_DESTINATION_HOST;
      if (backendHost) {
        const apiUrl = new URL(`${ensureTrailingSlash(backendHost)}${url.pathname}${url.search}`);
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
  matcher: ["/grafana/:path*", "/api/:path*"],
  dynamic: "force-dynamic",
};
