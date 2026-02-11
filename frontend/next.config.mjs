/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pluto/pyasic-bridge-client'],
  webpack: (config, { isServer }) => {
    // Ensure webpack resolves symlinked packages correctly
    config.resolve.symlinks = true;
    return config;
  },
};

export default nextConfig;
