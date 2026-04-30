/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  webpack: (config) => {
    // cloudflare:sockets is a runtime-only Cloudflare module — don't bundle it
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      ({ request }, callback) => {
        if (request === 'cloudflare:sockets') {
          return callback(null, 'commonjs cloudflare:sockets');
        }
        callback();
      },
    ];
    return config;
  },
};

module.exports = nextConfig;
