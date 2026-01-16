/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import type { NextApiRequest, NextApiResponse } from "next";
import http from "http";
import https from "https";

function pickHopByHopHeaders() {
  return new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ]);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    const backendHost = process.env.BACKEND_DESTINATION_HOST;
    if (!backendHost) {
      res.status(500).json({ error: "BACKEND_DESTINATION_HOST is not defined" });
      done();
      return;
    }

    const stripped = (req.url ?? "/").replace(/^\/api/, "") || "/";
    const targetUrl = new URL(stripped, backendHost);

    const isHttps = targetUrl.protocol === "https:";
    const client = isHttps ? https : http;

    const hopByHop = pickHopByHopHeaders();
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (hopByHop.has(key.toLowerCase())) continue;
      headers[key] = Array.isArray(value) ? value.join(",") : value;
    }
    headers.host = targetUrl.host;

    const proxyReq = client.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        method: req.method,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        headers,
        timeout: 10_000,
      },
      (proxyRes) => {
        const responseHeaders: Record<string, string | string[] | undefined> = {};
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (hopByHop.has(key.toLowerCase())) continue;
          responseHeaders[key] = value;
        }
        responseHeaders["cache-control"] = "no-store";

        res.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("timeout", () => {
      proxyReq.destroy(new Error("Upstream timeout"));
    });

    proxyReq.on("error", () => {
      if (!res.headersSent) {
        res.status(502).json({ error: "Backend unavailable" });
      }
      done();
    });

    res.on("finish", done);
    res.on("close", done);

    req.pipe(proxyReq);
  });
}
