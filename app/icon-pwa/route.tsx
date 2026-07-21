import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

/**
 * PWA / touch icon: white "S" on the startups.com red, matching their
 * app icon. ?size=192|512 (default 512), ?maskable=1 adds safe-zone
 * padding.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(
    1024,
    Math.max(64, parseInt(searchParams.get("size") || "512", 10) || 512)
  );
  const maskable = searchParams.has("maskable");

  // Maskable icons need ~80% safe zone; shrink the glyph accordingly.
  const glyph = Math.round(size * (maskable ? 0.5 : 0.68));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#d14423",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: glyph,
            fontWeight: 800,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            lineHeight: 1,
            transform: `translateY(${Math.round(size * -0.03)}px)`,
          }}
        >
          S
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
