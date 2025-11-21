/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Completely disable static page generation
  // This prevents the prerendering errors on /404 and /500
  output: undefined,
  distDir: '.next',
}

module.exports = nextConfig
