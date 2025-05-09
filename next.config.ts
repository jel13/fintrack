import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
   async redirects() {
    return [
      {
        source: '/categories',
        destination: '/categories', // Route to the actual categories page
        permanent: true, 
      },
        {
        source: '/saving-goals',
        destination: '/saving-goals', // Route to the actual saving goals page
        permanent: true,
      },
       {
        source: '/learn/budgeting-guide',
        destination: '/learn/budgeting-guide', // Route to the guide page
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
