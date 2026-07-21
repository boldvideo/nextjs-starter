import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
  frame: "#13121c",
  panel: "#1b1a28",
  border: "rgba(84, 83, 138, 0.45)",
  ink: "#fafafa",
  muted: "rgba(243, 232, 255, 0.72)",
  faint: "rgba(243, 232, 255, 0.5)",
  orange: "#fb923c",
  logoRed: "#d14423",
  gradFrom: "#d97258",
  gradTo: "#9858a3",
};

const DEFAULT_TAGLINE = "Make your request. We've probably answered it live.";
const DEFAULT_META =
  "Every episode of Startup Requests Live, one question away";

/** True for the site-level card (no specific video/page title). */
function isDefaultTitle(title: string): boolean {
  return title.startsWith("SRL");
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

/** The red startups.com logo box + the SRL tag. */
function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: COLORS.logoRed,
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 700,
          padding: "10px 18px",
          borderRadius: 8,
        }}
      >
        startups.com
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: COLORS.muted,
        }}
      >
        SRL
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
  const title = searchParams.get("t")?.slice(0, 120) || "SRL";
  const img = searchParams.get("img");
  const sub = searchParams.get("sub")?.slice(0, 160) || DEFAULT_TAGLINE;

  const fontText = `${title}${sub}${DEFAULT_META}${DEFAULT_TAGLINE}startups.comSRLPowered by BOLD`;
  const [extrabold, medium, imgSrc] = await Promise.all([
    loadGoogleFont("Poppins", 800, fontText),
    loadGoogleFont("Poppins", 500, fontText),
    img ? loadImageDataUri(img) : Promise.resolve(null),
  ]);

  const fonts = [
    ...(extrabold
      ? [{ name: "Poppins", data: extrabold, weight: 800 as const }]
      : []),
    ...(medium
      ? [{ name: "Poppins Medium", data: medium, weight: 500 as const }]
      : []),
  ];

  const baseStyle = {
    width: "100%",
    height: "100%",
    display: "flex" as const,
    backgroundColor: COLORS.frame,
    padding: 20,
    fontFamily: extrabold ? "Poppins" : "sans-serif",
    color: COLORS.ink,
  };

  const panelStyle = {
    display: "flex" as const,
    flex: 1,
    backgroundColor: COLORS.panel,
    backgroundImage: `radial-gradient(70% 60% at 80% -10%, rgba(152,88,163,0.22), transparent 60%), radial-gradient(60% 50% at 10% 110%, rgba(217,114,88,0.14), transparent 60%)`,
    border: `2px solid ${COLORS.border}`,
    borderRadius: 18,
  };

  // Video card: text column + thumbnail
  if (imgSrc) {
    return new ImageResponse(
      (
        <div style={baseStyle}>
          <div
            style={{ ...panelStyle, alignItems: "center", padding: 52, gap: 48 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                flex: 1,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            >
              <Wordmark />
              <div
                style={{
                  display: "flex",
                  fontSize: title.length > 60 ? 40 : 50,
                  fontWeight: 800,
                  lineHeight: 1.14,
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
              width={520}
              height={292}
              style={{
                width: 520,
                height: 292,
                objectFit: "cover",
                borderRadius: 14,
                border: `2px solid ${COLORS.border}`,
              }}
            />
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT, fonts }
    );
  }

  // Default site card: wordmark + the two-line gradient headline
  return new ImageResponse(
    (
      <div style={baseStyle}>
        <div
          style={{
            ...panelStyle,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 60,
          }}
        >
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {isDefaultTitle(title) ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 64,
                  fontWeight: 800,
                  lineHeight: 1.12,
                  letterSpacing: "-0.02em",
                }}
              >
                <span>Make your request.</span>
                <span
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${COLORS.gradFrom}, ${COLORS.gradTo})`,
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  We&apos;ve probably answered it live.
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: title.length > 40 ? 52 : 64,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  maxWidth: 1000,
                }}
              >
                {title}
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: 25,
                fontFamily: medium ? "Poppins Medium" : "sans-serif",
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
                fontSize: 21,
                color: COLORS.faint,
                fontFamily: medium ? "Poppins Medium" : "sans-serif",
              }}
            >
              Startup Requests Live · with Ed, Wil &amp; Ryan
            </div>
            <PoweredByBold />
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );
}
