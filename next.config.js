/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mux.com",
      },
      {
        protocol: "https",
        hostname: "uploads.eu1.boldvideo.io",
      },
      {
        protocol: "https",
        hostname: "yo.fm",
      },
    ],
  },
};

module.exports = nextConfig;
