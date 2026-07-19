import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
  bg: "#faf9f6",
  surface: "#fffefb",
  border: "#e6e3d9",
  ink: "#16150f",
  muted: "#55524a",
  faint: "#8a867b",
  gold: "#fabf19",
};

const DEFAULT_TAGLINE = "Ask me anything. I've probably filmed it.";
const DEFAULT_META = "Taki Moore's library, one question away — answers with receipts";

/** True for the site-level card (no specific video/page title). */
function isDefaultTitle(title: string): boolean {
  return title.startsWith("Taki AI");
}

/**
 * Fetch a Google Font as TTF for ImageResponse (which can't use woff2).
 * Returns null on any failure so the card still renders with the fallback.
 */
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string
): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(
      / /g,
      "+"
    )}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(
      /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/
    );
    if (!match) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Inline a remote image as a data URI — satori's own remote-image fetching
 * is unreliable, so we fetch it ourselves. Returns null on failure so the
 * card falls back to text-only.
 */
async function loadImageDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());

    // Sniff the actual format — satori only handles jpeg/png/gif, and CDNs
    // sometimes serve WebP behind a .jpg name (crashes the renderer).
    let type: string | null = null;
    if (buf[0] === 0xff && buf[1] === 0xd8) type = "image/jpeg";
    else if (buf[0] === 0x89 && buf[1] === 0x50) type = "image/png";
    else if (buf[0] === 0x47 && buf[1] === 0x49) type = "image/gif";
    if (!type) return null;

    let binary = "";
    for (let i = 0; i < buf.length; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return `data:${type};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

function Wordmark({ marker }: { marker: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        transform: "rotate(-1.5deg)",
        fontFamily: marker ? "Permanent Marker" : "sans-serif",
      }}
    >
      <div style={{ fontSize: 34, color: COLORS.ink }}>TAKI</div>
      <div
        style={{
          fontSize: 34,
          color: COLORS.ink,
          background: COLORS.gold,
          padding: "0 10px",
          borderRadius: 8,
          transform: "skewX(-4deg)",
        }}
      >
        AI
      </div>
    </div>
  );
}

function PoweredByBold() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 20,
        color: COLORS.faint,
      }}
    >
      Powered by
      <span
        style={{ fontWeight: 700, letterSpacing: "0.08em", color: COLORS.muted }}
      >
        BOLD
      </span>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("t")?.slice(0, 120) || "Taki AI";
  const img = searchParams.get("img");
  const sub = searchParams.get("sub")?.slice(0, 160) || DEFAULT_TAGLINE;

  const fontText = `${title}${sub}${DEFAULT_META}TAKIAIPowered by BOLD`;
  const [bold, medium, marker, imgSrc] = await Promise.all([
    loadGoogleFont("Bricolage Grotesque", 700, fontText),
    loadGoogleFont("DM Sans", 500, fontText),
    loadGoogleFont("Permanent Marker", 400, "TAKIAI"),
    img ? loadImageDataUri(img) : Promise.resolve(null),
  ]);

  const fonts = [
    ...(bold
      ? [{ name: "Bricolage Grotesque", data: bold, weight: 700 as const }]
      : []),
    ...(medium ? [{ name: "DM Sans", data: medium, weight: 500 as const }] : []),
    ...(marker
      ? [{ name: "Permanent Marker", data: marker, weight: 400 as const }]
      : []),
  ];

  const baseStyle = {
    width: "100%",
    height: "100%",
    display: "flex" as const,
    backgroundColor: COLORS.bg,
    backgroundImage: `radial-gradient(75% 60% at 25% -10%, rgba(250,191,25,0.16), transparent 60%)`,
    fontFamily: bold ? "Bricolage Grotesque" : "sans-serif",
    color: COLORS.ink,
  };

  // Video card: text column + thumbnail
  if (imgSrc) {
    return new ImageResponse(
      (
        <div style={{ ...baseStyle, alignItems: "center", padding: 64, gap: 56 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              flex: 1,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            <Wordmark marker={!!marker} />
            <div
              style={{
                display: "flex",
                fontSize: title.length > 60 ? 44 : 54,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </div>
            <PoweredByBold />
          </div>
          <img
            src={imgSrc}
            alt=""
            width={560}
            height={315}
            style={{
              width: 560,
              height: 315,
              objectFit: "cover",
              borderRadius: 16,
              border: `4px solid ${COLORS.ink}`,
            }}
          />
        </div>
      ),
      { width: WIDTH, height: HEIGHT, fonts }
    );
  }

  // Default site card: wordmark + big tagline
  return new ImageResponse(
    (
      <div
        style={{
          ...baseStyle,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
        }}
      >
        <Wordmark marker={!!marker} />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 40 && !isDefaultTitle(title) ? 56 : 72,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {isDefaultTitle(title) ? sub : title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontFamily: medium ? "DM Sans" : "sans-serif",
              color: COLORS.muted,
            }}
          >
            {isDefaultTitle(title) ? DEFAULT_META : sub}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: COLORS.faint,
              fontFamily: medium ? "DM Sans" : "sans-serif",
            }}
          >
            Every framework, every play, every rant — with receipts
          </div>
          <PoweredByBold />
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );
}
