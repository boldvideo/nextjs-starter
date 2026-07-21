import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SRL — Startup Requests Live",
    short_name: "SRL",
    description:
      "Every episode of Startup Requests Live, one question away — answers with the exact moments Ed, Wil & Ryan covered it on the show.",
    start_url: "/",
    display: "standalone",
    background_color: "#13121c",
    theme_color: "#13121c",
    icons: [
      {
        src: "/icon-pwa?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-pwa?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-pwa?size=512&maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
