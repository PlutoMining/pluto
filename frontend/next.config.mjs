/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pluto/interfaces"],
  webpack: (config, { isServer }) => {
    // Ensure webpack resolves symlinked packages correctly
    config.resolve.symlinks = true;
    return config;
  },
};

export default nextConfig;
