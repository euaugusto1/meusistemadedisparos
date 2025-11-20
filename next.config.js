/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
  // Disable static generation for pages that need dynamic rendering
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig
