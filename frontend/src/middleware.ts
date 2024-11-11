import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Gestione delle richieste verso Grafana
  if (url.pathname.startsWith("/grafana")) {
    const grafanaUrl = new URL(`${process.env.GF_HOST!}${url.pathname}`, req.url);

    // Crea la risposta riscrivendo l'URL
    const response = NextResponse.rewrite(grafanaUrl);

    if (!url.pathname.startsWith("/grafana/public-dashboards")) {
      // Aggiungi gli headers personalizzati per le richieste verso Grafana
      response.headers.set("X-WEBAUTH-USER", "admin");
    }

    // Aggiungi l'header per permettere il caricamento in iframe
    response.headers.set("X-Frame-Options", "ALLOWALL");

    // Imposta il Content-Security-Policy per consentire iframe da qualsiasi origine
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self' *;");

    if (url.pathname.includes("/api") && !url.pathname.includes("api/user/auth-tokens/rotate")) {
      response.headers.set("Origin", process.env.GF_HOST!);
    }

    return response;
  }

  // Se nessuna condizione è soddisfatta, prosegui normalmente
  return NextResponse.next();
}

// Configurazione del matcher (opzionale)
export const config = {
  matcher: ["/grafana/:path*"],
  dynamic: "force-dynamic",
};
