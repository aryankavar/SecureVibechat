/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  experimental: {
    turbopack: {
      root: '../../',
    },
  },
};

module.exports = nextConfig;
