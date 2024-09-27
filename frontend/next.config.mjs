/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // const grafanaDestinationHost = process.env.GF_HOST;
    const backendDestinationHost = process.env.BACKEND_DESTINATION_HOST;

    return {
      // beforeFiles: [
      //   // These rewrites are checked after headers/redirects
      //   // and before all files including _next/public files which
      //   // allows overriding page files
      //   {
      //     source: "/some-page",
      //     destination: "/somewhere-else",
      //     has: [{ type: "query", key: "overrideMe" }],
      //   },
      // ],
      // afterFiles: [
      //   // These rewrites are checked after pages/public files
      //   // are checked but before dynamic routes
      //   {
      //     source: "/non-existent",
      //     destination: "/somewhere-else",
      //   },
      // ],
      fallback: [
        // These rewrites are checked after both pages/public files
        // and dynamic routes are checked
        // {
        //   source: "/grafana/:path*", // @remarks handled better in middleware.ts
        //   destination: `${grafanaDestinationHost}/grafana/:path*`, // Cambia con l'URL della tua istanza di Grafana
        // },
        {
          source: "/api/:path*",
          destination: `${backendDestinationHost}/:path*`, // Cambia con l'URL della tua istanza di Grafana
        },
      ],
    };
  },
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: "https",
  //       hostname: "c.animaapp.com",
  //       port: "",
  //       //   pathname: '/account123/**',
  //     },
  //   ],
  // },
};

export default nextConfig;
