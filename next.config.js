
/** @type {import('next').NextConfig} */
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const normalizedSupabaseUrl = rawSupabaseUrl.startsWith("https://")
  ? rawSupabaseUrl
  : rawSupabaseUrl
    ? `https://${rawSupabaseUrl}.supabase.co`
    : ""

let supabaseHostname = ""
try {
  supabaseHostname = normalizedSupabaseUrl ? new URL(normalizedSupabaseUrl).hostname : ""
} catch {
  supabaseHostname = ""
}

const remotePatterns = []
if (supabaseHostname) {
  remotePatterns.push({
    protocol: 'https',
    hostname: supabaseHostname,
    pathname: '/storage/v1/object/public/**',
  })
}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns,
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development'
              ? 'no-cache, no-store, must-revalidate'
              : 'public, max-age=3600, must-revalidate'
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *"
          }
        ]
      }
    ]
  },
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true
}

module.exports = nextConfig
