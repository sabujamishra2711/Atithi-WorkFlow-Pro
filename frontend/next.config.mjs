import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Set asset prefix for correct path resolution
  assetPrefix: '',
  basePath: '',
  // Add memory optimization settings
  // swcMinify: true, // Removed as it's not a valid option
  // Disable font optimization for offline builds
  experimental: {
    // Reduce memory usage during build
    optimizePackageImports: [], // Changed from boolean to array
  },

  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    }

    // Handle Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      url: false,
      encoding: false,
    }

    return config
  },

  async rewrites() {
    // Determine backend URL based on environment
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    // Apply rewrites in both development and production
    return [
      {
        source: '/api/employees',
        destination: `${backendUrl}/api/v1/employees/getAllEmployees`,
      },
      {
        source: '/api/employees/:path*',
        destination: `${backendUrl}/api/v1/employees/:path*`,
      },
      {
        source: '/api/v1/punch/:path*',
        destination: `${backendUrl}/api/v1/punch/:path*`,
      },
      {
        source: '/api/v1/contractors/:path*',
        destination: `${backendUrl}/api/v1/contractors/:path*`,
      },
      {
        source: '/api/v1/employees/:path*',
        destination: `${backendUrl}/api/v1/employees/:path*`,
      },
      {
        source: '/api/v1/auth/:path*',
        destination: `${backendUrl}/api/v1/auth/:path*`,
      },
      {
        source: '/api/v1/attendance/:path*',
        destination: `${backendUrl}/api/v1/attendance/:path*`,
      },
      {
        source: '/api/v1/dashboard/:path*',
        destination: `${backendUrl}/api/v1/dashboard/:path*`,
      },
      {
        source: '/api/v1/leave/:path*',
        destination: `${backendUrl}/api/v1/leave/:path*`,
      },
      {
        source: '/api/v1/report/:path*',
        destination: `${backendUrl}/api/v1/report/:path*`,
      },
      {
        source: '/api/v1/visitor/:path*',
        destination: `${backendUrl}/api/v1/visitor/:path*`,
      },
      {
        source: '/api/v1/profile/:path*',
        destination: `${backendUrl}/api/v1/profile/:path*`,
      },
      {
        source: '/api/v1/settings/:path*',
        destination: `${backendUrl}/api/v1/settings/:path*`,
      },
        {
          source: '/api/v1/payroll/:path*',
          destination: `${backendUrl}/api/v1/payroll/:path*`,
        },
        {
          source: '/api/v1/payment/:path*',
          destination: `${backendUrl}/api/v1/payment/:path*`,
        },
        {
          source: '/api/v1/payment',
          destination: `${backendUrl}/api/v1/payment`,
        },
        {
          source: '/api/v1/notification/:path*',
          destination: `${backendUrl}/api/v1/notification/:path*`,
        },
      {
        source: '/api/v1/system/:path*',
        destination: `${backendUrl}/api/v1/system/:path*`,
      }
    ]
  }
}

export default nextConfig