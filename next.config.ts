import type {NextConfig} from 'next';

// Bundle analyzer for performance optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  // Removed 'output: export' to support API routes and SSR
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  compress: true, // Enable gzip compression
  productionBrowserSourceMaps: false, // Disable source maps in production
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true, // Enable React strict mode for better debugging
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons', '@radix-ui/*'],
    optimizeCss: true, // Enable CSS optimization
    scrollRestoration: true, // Better scroll restoration
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Add webpack configuration to handle problematic modules
  webpack: (config, { isServer }) => {
    // This prevents the 'handlebars' module from being bundled on the client
    // where it's not needed and causes build errors.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'handlebars': false
      };
    }
    return config;
  },

  // Allow Firebase Studio environment
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
