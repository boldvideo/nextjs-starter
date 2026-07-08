import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

/**
 * PWA / touch icon: the wordmark's glowing teal dot on the brand near-black.
 * ?size=192|512 (default 512), ?maskable=1 adds safe-zone padding.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(
    1024,
    Math.max(64, parseInt(searchParams.get("size") || "512", 10) || 512)
  );
  const maskable = searchParams.has("maskable");

  // Maskable icons need ~80% safe zone; shrink the mark accordingly.
  const dot = Math.round(size * (maskable ? 0.3 : 0.4));
  const radius = Math.round(dot * 0.28);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a09",
          backgroundImage:
            "radial-gradient(70% 70% at 50% 35%, rgba(45,212,191,0.12), transparent 65%)",
        }}
      >
        <div
          style={{
            width: dot,
            height: dot,
            borderRadius: radius,
            background: "#2dd4bf",
            boxShadow: `0 0 ${Math.round(dot * 0.9)}px rgba(45,212,191,0.55)`,
          }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
