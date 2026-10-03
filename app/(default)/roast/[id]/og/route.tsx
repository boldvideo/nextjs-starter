import { ImageResponse } from "next/og";

import { GYM_PUBLIC_HOST } from "@/lib/gym-meta";
import { rankFor } from "@/lib/gym-roast";
import { loadRoast } from "@/lib/gym-roast-load";
import { sharerName } from "@/lib/gym-share";

/**
 * Roast share card: /roast/<id>/og. The reply score, its rank and the
 * Game Master's verdict, never the pitch itself. Built to read at timeline
 * size (nothing under 30px at 1200 wide), bottom-left clear for X.
 */

const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = {
  night: "#0b0618",
  chalk: "#f6f0ff",
  haze: "#a99bcc",
  pink: "#ff2ea6",
  cyan: "#22e6ff",
  orange: "#ff8a1f",
  yellow: "#ffd23f",
};
const RANK_COLOR: Record<string, string> = {
  "PERFECT RUN": COLORS.yellow,
  "HIGH SCORE": COLORS.cyan,
  "CONTINUE?": COLORS.orange,
  "GAME OVER": COLORS.pink,
};
const HOST = GYM_PUBLIC_HOST.toUpperCase();
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

async function loadGoogleFont(family: string, text: string, weight?: number): Promise<ArrayBuffer | null> {
  const fam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : "");
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(text)}`).then((r) =>
      r.ok ? r.text() : ""
    );
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

async function asJpeg(image: ImageResponse): Promise<Response> {
  const png = Buffer.from(await image.arrayBuffer());
  try {
    const { default: sharp } = await import("sharp");
    const jpg = await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE } });
  } catch {
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": CACHE } });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { origin } = new URL(request.url);
  const loaded = await loadRoast(id);
  const score = loaded?.roast.score ?? null;
  if (!loaded || score === null) return Response.redirect(new URL("/gym/og-home.jpg", request.url), 302);

  const rank = rankFor(score);
  const color = RANK_COLOR[rank.label] ?? COLORS.pink;
  const words = loaded.roast.verdict.split(/\s+/).filter(Boolean);
  const verdict = words.length > 22 ? `${words.slice(0, 22).join(" ")}…` : loaded.roast.verdict;
  const vSize = verdict.length <= 70 ? 44 : verdict.length <= 110 ? 38 : 34;
  // Whose pitch (?by=Marcel) on the stamp
  const by = sharerName(new URL(request.url).searchParams.get("by"));
  const stamp = by ? `${by.toUpperCase()}'S PITCH, ROASTED` : "ROAST MY PITCH";
  const text = `THE GTM GAMEby FounderWell${stamp}REPLY SCORE${score}/100${rank.label}${verdict}ROAST YOURS ▶ ${HOST}/ROAST`;

  const [bungee, grotesk, osd, logo, bg] = await Promise.all([
    loadGoogleFont("Bungee", text),
    loadGoogleFont("Space Grotesk", text, 700),
    loadGoogleFont("VT323", text),
    loadImage(`${origin}/gym/game/logo-og.png`),
    loadImage(`${origin}/gym/og-bg.jpg`),
  ]);

  return asJpeg(
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            backgroundColor: COLORS.night,
            fontFamily: "Space Grotesk",
            color: COLORS.chalk,
          }}
        >
          {bg && <img src={bg} width={WIDTH} height={HEIGHT} alt="" style={{ position: "absolute", top: 0, left: 0 }} />}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WIDTH,
              height: HEIGHT,
              display: "flex",
              backgroundImage: "linear-gradient(90deg, rgba(11,6,24,0.94) 0%, rgba(11,6,24,0.82) 60%, rgba(11,6,24,0.55) 100%)",
            }}
          />

          <div style={{ position: "absolute", top: 36, left: 48, display: "flex", alignItems: "center", gap: 14 }}>
            {logo && <img src={logo} width={60} height={60} alt="" />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Bungee", fontSize: 26, color: COLORS.orange, lineHeight: 1 }}>THE GTM GAME</div>
              <div style={{ display: "flex", marginTop: 6, fontSize: 20, color: COLORS.haze }}>by FounderWell</div>
            </div>
          </div>

          {/* Left: the stamp, the rank, the verdict */}
          <div style={{ position: "absolute", left: 48, top: 150, width: 690, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Bungee",
                fontSize: 26,
                lineHeight: 1,
                color: "#1a0616",
                backgroundColor: COLORS.pink,
                padding: "10px 16px",
                borderRadius: 8,
                boxShadow: `4px 4px 0 ${COLORS.yellow}`,
                transform: "rotate(-2deg)",
              }}
            >
              {stamp}
            </div>
            <div style={{ display: "flex", marginTop: 34, fontFamily: "Bungee", fontSize: 58, lineHeight: 1, color }}>{rank.label}</div>
            <div style={{ display: "flex", marginTop: 22, fontSize: vSize, fontWeight: 700, lineHeight: 1.18, letterSpacing: "-0.01em" }}>
              {`“${verdict}”`}
            </div>
          </div>

          {/* Right: the score */}
          <div
            style={{
              position: "absolute",
              right: 56,
              top: 120,
              width: 380,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", fontFamily: "VT323", fontSize: 40, color: COLORS.haze, lineHeight: 1 }}>REPLY SCORE</div>
            <div
              style={{
                display: "flex",
                fontFamily: "Bungee",
                fontSize: 230,
                lineHeight: 1,
                color,
                textShadow: `0 0 40px ${color}`,
                marginTop: 6,
              }}
            >
              {String(score)}
            </div>
            <div style={{ display: "flex", fontFamily: "VT323", fontSize: 44, color: COLORS.chalk, lineHeight: 1 }}>/ 100</div>
          </div>

          <div
            style={{
              position: "absolute",
              right: 48,
              bottom: 36,
              display: "flex",
              fontFamily: "VT323",
              fontSize: 34,
              color: COLORS.cyan,
            }}
          >
            {`ROAST YOURS ▶ ${HOST}/ROAST`}
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: [
          bungee && { name: "Bungee", data: bungee, weight: 400 as const, style: "normal" as const },
          grotesk && { name: "Space Grotesk", data: grotesk, weight: 700 as const, style: "normal" as const },
          osd && { name: "VT323", data: osd, weight: 400 as const, style: "normal" as const },
        ].filter((f): f is NonNullable<typeof f> => Boolean(f)),
      }
    )
  );
}
