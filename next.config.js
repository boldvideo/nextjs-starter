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

// Goatmire: every old portal link (/v/<hashid>, /v/<uuid>, /v/<slug>) moves
// permanently to the talk's place in its edition, e.g. /2025/the-oban-murders.
// The running-order JSON is the mapping.
nextConfig.redirects = async () => {
  const out = [];
  for (const year of [2025, 2026]) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS config
    const programme = require(`./content/${year}.json`);
    const items = [
      ...programme.days.flatMap((d) => d.entries.filter((e) => e.kind === "talk")),
      ...(programme.extras || []),
    ];
    for (const t of items) {
      for (const legacy of t.legacy || []) {
        for (const prefix of ["/v/", `/${year}/`]) {
          if (`${prefix}${legacy}` === `/${year}/${t.slug}`) continue;
          out.push({ source: `${prefix}${legacy}`, destination: `/${year}/${t.slug}`, permanent: true });
        }
      }
    }
  }
  return out;
};

module.exports = nextConfig;
