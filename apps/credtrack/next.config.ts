import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse', 'tesseract.js', 'canvas'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack(config) {
    // pnpm creates a stub @prisma/client in apps/credtrack/node_modules that resolves
    // .prisma/client relative to itself — but the generated client lives at the monorepo root.
    // Force both aliases to the root-level generated client.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@prisma/client': path.resolve(__dirname, '../../node_modules/@prisma/client'),
      '.prisma/client': path.resolve(__dirname, '../../node_modules/.prisma/client'),
    };
    return config;
  },
};

export default nextConfig;
