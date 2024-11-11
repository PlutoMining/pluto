import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  const internalApiRoutes = ["/api/app-version"];

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

  // Gestione delle richieste verso l'API backend
  if (url.pathname.startsWith("/api")) {
    // Verifica se la rotta è tra quelle da escludere
    const isInternalRoute = internalApiRoutes.some((route) => url.pathname.startsWith(route));

    if (!isInternalRoute) {
      const backendHost = process.env.BACKEND_DESTINATION_HOST;
      if (backendHost) {
        const apiUrl = new URL(`${backendHost}${url.pathname}${url.search}`);
        return NextResponse.rewrite(apiUrl);
      } else {
        console.error("Errore: BACKEND_DESTINATION_HOST non è definito");
        return NextResponse.next(); // O restituisci un errore personalizzato
      }
    }
  }

  // Se nessuna condizione è soddisfatta, prosegui normalmente
  return NextResponse.next();
}

// Configurazione del matcher per gestire entrambe le rotte
export const config = {
  matcher: ["/grafana/:path*", "/api/:path*"],
  dynamic: "force-dynamic",
};
