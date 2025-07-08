import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configure canvas module resolution for react-pdf 8.0.2
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    // Add fallback for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      os: false,
    };
    
    // Mark canvas as external for server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas');
      }
    }
    
    return config;
  },
  
  // Ensure proper content-type for worker files
  async headers() {
    return [
      {
        source: '/pdf.worker.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
