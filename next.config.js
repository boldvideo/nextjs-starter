/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok and other dev origins (optional, suppresses warning)
  allowedDevOrigins: ["bold.eu.ngrok.io", "*.ngrok.io", "*.ngrok-free.app"],

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
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },

  // Next.js 16: Enable React Compiler for automatic memoization
  reactCompiler: true,

  // Next.js 16: Enable Turbopack filesystem caching for faster dev restarts
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

module.exports = nextConfig;
