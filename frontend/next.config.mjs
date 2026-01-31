/** @type {import('next').NextConfig} */
const nextConfig = {
  // Resolve and transpile local @pluto packages (file: deps) so they bundle correctly in Docker
  transpilePackages: ["@pluto/utils", "@pluto/interfaces"],
};

export default nextConfig;
