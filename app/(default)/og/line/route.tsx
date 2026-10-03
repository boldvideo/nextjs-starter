import { ImageResponse } from "next/og";

import { GYM_PUBLIC_HOST } from "@/lib/gym-meta";
import { cleanLine } from "@/lib/gym-line";
import { COACHES, coachLabel } from "@/components/gym/gym-coaches-data";
import { sharerName } from "@/lib/gym-share";

/**
 * "Share this line" card: /og/line?t=<line>&c=<coach slug>
 * The line in huge type, the coach's face and "COACH DREW'S PLAY".
 * Built to read at timeline size (nothing under 30px at 1200 wide) with the
 * bottom-left corner left clear for X's domain overlay.
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

/** Satori can't decode webp: anything that isn't PNG/JPEG goes through sharp. */
async function loadImage(url: string, size?: number): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    let buf: Buffer = Buffer.from(await res.arrayBuffer());
    let type = res.headers.get("content-type") || "image/png";
    if (!/png|jpe?g/.test(type) || size) {
      const { default: sharp } = await import("sharp");
      const img = sharp(buf);
      buf = await (size ? img.resize(size, size) : img).png().toBuffer();
      type = "image/png";
    }
    return `data:${type};base64,${buf.toString("base64")}`;
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const line = cleanLine(searchParams.get("t") ?? "");
  if (!line) return Response.redirect(new URL("/gym/og-home.jpg", request.url), 302);
  const coach = COACHES.find((c) => c.slug === searchParams.get("c")) ?? null;

  const quoted = `“${line}”`;
  const credit = coach ? `${coachLabel(coach).toUpperCase()}'S PLAY` : "GAME MASTER'S PLAY";
  const size = line.length <= 50 ? 66 : line.length <= 90 ? 56 : line.length <= 135 ? 48 : 42;
  // Who sent it (?by=Marcel) takes the footer
  const by = sharerName(searchParams.get("by"));
  const footer = by ? `FROM ${by.toUpperCase()} ▶ ${HOST}` : `THE FULL PLAY ▶ ${HOST}`;
  const text = `THE GTM GAMEby FounderWellSAY IT LIKE THIS${quoted}${credit}${footer}`;

  const [bungee, grotesk, osd, logo, face, bg] = await Promise.all([
    loadGoogleFont("Bungee", text),
    loadGoogleFont("Space Grotesk", text, 700),
    loadGoogleFont("VT323", text),
    loadImage(`${origin}/gym/game/logo-og.png`),
    coach ? loadImage(`${origin}/gym/game/cast/${coach.slug}.webp`, 240) : loadImage(`${origin}/gym/game/game-master-bot-og.png`, 240),
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
          {/* Darken the sunset so the line reads */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WIDTH,
              height: HEIGHT,
              display: "flex",
              backgroundImage: "linear-gradient(90deg, rgba(11,6,24,0.92) 0%, rgba(11,6,24,0.78) 62%, rgba(11,6,24,0.35) 100%)",
            }}
          />

          <div style={{ position: "absolute", top: 36, left: 48, display: "flex", alignItems: "center", gap: 14 }}>
            {logo && <img src={logo} width={60} height={60} alt="" />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Bungee", fontSize: 26, color: COLORS.orange, lineHeight: 1 }}>THE GTM GAME</div>
              <div style={{ display: "flex", marginTop: 6, fontSize: 20, color: COLORS.haze }}>by FounderWell</div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 48,
              top: 140,
              width: 790,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Bungee",
                fontSize: 24,
                lineHeight: 1,
                color: "#1a0616",
                backgroundColor: COLORS.pink,
                padding: "9px 14px",
                borderRadius: 8,
                boxShadow: `4px 4px 0 ${COLORS.yellow}`,
                transform: "rotate(-2deg)",
                marginBottom: 28,
              }}
            >
              SAY IT LIKE THIS
            </div>
            <div style={{ display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em" }}>
              {quoted}
            </div>
          </div>

          {/* The coach, right column */}
          <div
            style={{
              position: "absolute",
              right: 56,
              top: 150,
              width: 260,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {face && (
              <img
                src={face}
                width={220}
                height={220}
                alt=""
                style={{ borderRadius: 999, border: `5px solid ${COLORS.cyan}`, boxShadow: "0 0 40px rgba(34,230,255,0.55)" }}
              />
            )}
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontFamily: "VT323",
                fontSize: 36,
                lineHeight: 1,
                color: COLORS.yellow,
                textAlign: "center",
              }}
            >
              {credit}
            </div>
          </div>

          {/* Bottom right: bottom-left stays clear for X's overlay */}
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
            {footer}
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
