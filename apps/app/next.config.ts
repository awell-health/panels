import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        search: '',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        search: '',
      },
    ],
  },
}

export default nextConfig
