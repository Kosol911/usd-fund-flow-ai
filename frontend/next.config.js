/** @type {import('next').NextConfig} */
const path = require('path');
const BACKEND_URL = process.env.BACKEND_URL || 'http://192.168.0.8:8000';

const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
