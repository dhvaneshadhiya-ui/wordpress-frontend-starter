/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'dev.igeeksblog.com',
      'secure.gravatar.com',
      'i0.wp.com',
      'i1.wp.com',
      'i2.wp.com',
    ],
    unoptimized: true,
  },
  // Ensure trailing slashes match WordPress URL structure
  trailingSlash: false,
};

module.exports = nextConfig;
