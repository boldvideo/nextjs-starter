import { ImageResponse } from "next/og";
import { GYM_PUBLIC_HOST } from "@/lib/gym-meta";
import { cleanInitials, cleanScore, pipeline } from "@/components/gym/dodger/challenge";

/**
 * Challenge card for /beat/<score>: "BEAT $4,200" on the secret level.
 * Same recipe as /og (satori → JPEG under 300KB, nothing under 30px at 1200
 * wide, bottom-left kept clear for X's domain overlay).
 */

const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = { night: "#0b0618", chalk: "#f6f0ff", haze: "#a99bcc", pink: "#ff2ea6", cyan: "#22e6ff", orange: "#ff8a1f", yellow: "#ffd23f" };
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

async function loadGoogleFont(family: string, text: string, weight?: number): Promise<ArrayBuffer | null> {
  const fam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : "");
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(text)}`).then((r) => (r.ok ? r.text() : ""));
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const beat = cleanScore(searchParams.get("beat"));
  if (!beat) return Response.redirect(new URL("/gym/og-home.jpg", request.url), 302);
  const by = cleanInitials(searchParams.get("by"));

  const score = pipeline(beat);
  const invite = by ? `${by} INVITED YOU TO THE SECRET LEVEL` : "YOU'RE INVITED TO THE SECRET LEVEL";
  const host = GYM_PUBLIC_HOST.toUpperCase();
  const text = `OBJECTION DODGERBEAT ${score}${invite}THE CODE? FIND IT YOURSELF.${host}1UPINSERT COIN`;
  const [bungee, osd, bg] = await Promise.all([
    loadGoogleFont("Bungee", text),
    loadGoogleFont("VT323", text),
    loadImage(`${origin}/gym/og-bg.jpg`),
  ]);
  const scoreSize = score.length <= 7 ? 150 : score.length <= 9 ? 124 : 104;

  return asJpeg(
    new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: COLORS.night, color: COLORS.chalk }}>
          {bg && <img src={bg} width={WIDTH} height={HEIGHT} alt="" style={{ position: "absolute", top: 0, left: 0 }} />}
          <div style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: HEIGHT, display: "flex", backgroundColor: "rgba(11,6,24,0.55)" }} />
          <div style={{ position: "absolute", top: 40, right: 52, display: "flex", flexDirection: "column", alignItems: "flex-end", fontFamily: "VT323", fontSize: 34, lineHeight: 1, textShadow: "0 0 10px rgba(34,230,255,0.7)" }}>
            <div style={{ display: "flex", color: COLORS.pink }}>1UP</div>
            <div style={{ display: "flex", marginTop: 6 }}>INSERT COIN</div>
          </div>
          <div style={{ position: "absolute", left: 0, top: 70, width: WIDTH, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontFamily: "VT323", fontSize: 44, color: COLORS.cyan, letterSpacing: 1 }}>{invite}</div>
            <div style={{ display: "flex", marginTop: 18, fontFamily: "Bungee", fontSize: 56, color: COLORS.chalk, lineHeight: 1 }}>BEAT</div>
            <div style={{ display: "flex", marginTop: 6, fontFamily: "Bungee", fontSize: scoreSize, color: COLORS.yellow, lineHeight: 1, textShadow: `6px 6px 0 ${COLORS.pink}` }}>{score}</div>
            <div style={{ display: "flex", marginTop: 26, fontFamily: "Bungee", fontSize: 40, color: COLORS.orange, lineHeight: 1 }}>OBJECTION DODGER</div>
            <div style={{ display: "flex", marginTop: 18, fontFamily: "VT323", fontSize: 40, color: COLORS.haze }}>THE CODE? FIND IT YOURSELF.</div>
          </div>
          <div style={{ position: "absolute", right: 52, bottom: 40, display: "flex", fontFamily: "VT323", fontSize: 34, color: COLORS.cyan }}>{host}</div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: [
          bungee && { name: "Bungee", data: bungee, weight: 400 as const, style: "normal" as const },
          osd && { name: "VT323", data: osd, weight: 400 as const, style: "normal" as const },
        ].filter((f): f is NonNullable<typeof f> => Boolean(f)),
      }
    )
  );
}
