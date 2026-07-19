import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

/**
 * PWA / touch icon: marker-drawn "T" on the Taki gold.
 * ?size=192|512 (default 512), ?maskable=1 adds safe-zone padding.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(
    1024,
    Math.max(64, parseInt(searchParams.get("size") || "512", 10) || 512)
  );
  const maskable = searchParams.has("maskable");

  // Maskable icons need ~80% safe zone; shrink the glyph accordingly.
  const glyph = Math.round(size * (maskable ? 0.52 : 0.72));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fabf19",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 64 64" fill="none">
          <path
            d="M14 20.5 C 24 17.8, 40 18.6, 50.5 19.8"
            stroke="#16150f"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <path
            d="M32.8 21.5 C 32 31, 31.4 39, 32.4 49.5"
            stroke="#16150f"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
