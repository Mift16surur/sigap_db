/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:4000"}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
