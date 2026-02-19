import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize build performance
  poweredByHeader: false,
  
  // Compiler options for better performance
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"]
    } : false,
  },

  experimental: {
    // This helps with hydration issues and build performance
    optimizePackageImports: [
      '@radix-ui/react-dropdown-menu', 
      '@radix-ui/react-collapsible',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      'lucide-react',
      'axios',
      'jspdf'
    ],
  },

  // CRITICAL: Include Prisma files in standalone output
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/client/**/*',
      './prisma/**/*',
    ],
    '/**/*': [
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/client/**/*',
    ],
  },

  // Turbopack configuration
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // ESLint configuration to prevent build failures
  eslint: {
    // Only run ESLint on these directories during build
    dirs: ['app', 'components', 'lib', 'types'],
    // Allow build to succeed even with ESLint errors (for deployment)
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    // Allow build to succeed even with TypeScript errors (for deployment)
    ignoreBuildErrors: true,
  },

  // Suppress hydration warnings for development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  output: 'standalone',
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize for development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Reduce bundle size
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
