import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.bricklink.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.bricklink.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
