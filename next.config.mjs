/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Azure App Service üçün standalone output
  output: 'standalone',

  // Azure üçün experimental konfiqurasiyalar
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  // Frontend /api/* istəklərini backend konteynerə yönləndirir
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://papercut-backend-container.ambitiousmoss-ff53d/api/:path*',
      },
    ];
  },

  // CORS və Cache-Control başlıqları
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://papercut-backend-container.ambitiousmoss-ff53d' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
          // Cache control başlıqları
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;
