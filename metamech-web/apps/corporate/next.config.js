/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  transpilePackages: ['@metamech/brand', '@metamech/shared', '@metamech/ui'],
};

module.exports = nextConfig;
