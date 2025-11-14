/** @type {import('next').NextConfig} */
const PROD_API_URL = 'https://hugs-backend-prod-787273457651.europe-west3.run.app';
const FALLBACK_API_URL = process.env.NEXT_PUBLIC_API_URL || PROD_API_URL;

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://hugs-backend-prod-787273457651.europe-west3.run.app; img-src 'self' data: https://placehold.co https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: CONTENT_SECURITY_POLICY.replace(/\s{2,}/g, ' ').trim(),
  },
];

const longTermCacheHeaders = [
  {
    key: 'Cache-Control',
    value: 'public, max-age=31536000, immutable',
  },
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: FALLBACK_API_URL,
    NEXT_PUBLIC_API_FALLBACK: PROD_API_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: longTermCacheHeaders,
      },
      {
        source: '/static/:path*',
        headers: longTermCacheHeaders,
      },
      {
        source: '/fonts/:path*',
        headers: longTermCacheHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
