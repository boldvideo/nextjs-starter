import { ImageResponse } from "next/og";

import { getTenantContext } from "@/lib/get-tenant-context";
import { GYM_PUBLIC_HOST } from "@/lib/gym-meta";
import { sharerName } from "@/lib/gym-share";
import { coachLabel, COACHES } from "@/components/gym/gym-coaches-data";

const COACH_SLUGS = new Set(COACHES.map((c) => c.slug));

/**
 * The GTM Game social cards (fork-owned; replaces the tenant-branded card).
 *
 *   /og?q=<question>&by=&coach=  a shared answer: who asked, the question, the coach
 *   /og?v=<videoId>[&t=s]   a session: frame at t, title, PLAY timecode
 *   /og                     → the static homepage card (/gym/og-home.jpg),
 *                             rendered from real CSS — satori can't do the
 *                             perspective floor or the chrome lettering.
 *
 * Satori/resvg can't decode webp, so the logo and coach are PNG copies.
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

/** Google font as TTF for satori, subset to the text it renders. */
async function loadGoogleFont(
  family: string,
  text: string,
  weight?: number
): Promise<ArrayBuffer | null> {
  const fam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : "");
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(text)}`
    ).then((r) => (r.ok ? r.text() : ""));
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
    const buf = Buffer.from(await res.arrayBuffer());
    // Satori can't draw webp (the coach portraits): hand it a PNG
    if (type.includes("webp")) {
      const { default: sharp } = await import("sharp");
      const png = await sharp(buf).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    }
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * ImageResponse only emits PNG (~380KB for these cards); WhatsApp drops
 * previews over ~300KB. Re-encode as JPEG with the sharp that ships with
 * Next; fall back to the PNG if that fails.
 */
async function asJpeg(image: ImageResponse): Promise<Response> {
  const png = Buffer.from(await image.arrayBuffer());
  try {
    const { default: sharp } = await import("sharp");
    const jpg = await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE },
    });
  } catch {
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": CACHE },
    });
  }
}

function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function Brand({ logo }: { logo: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {logo && <img src={logo} width={64} height={64} alt="" />}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Bungee", fontSize: 26, color: COLORS.orange, lineHeight: 1 }}>
          THE GTM GAME
        </div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 18, color: COLORS.haze }}>
          by&nbsp;<span style={{ color: COLORS.chalk }}>FounderWell</span>
        </div>
      </div>
    </div>
  );
}

/** Top-right cabinet HUD: 1UP over a blinking-in-spirit INSERT COIN. */
function Hud() {
  return (
    <div
      style={{
        position: "absolute",
        top: 38,
        right: 48,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        fontFamily: "VT323",
        fontSize: 30,
        lineHeight: 1,
        color: "#ffffff",
        textShadow: "0 0 10px rgba(34,230,255,0.7)",
      }}
    >
      <div style={{ display: "flex", color: COLORS.pink }}>1UP</div>
      <div style={{ display: "flex", marginTop: 6 }}>INSERT COIN</div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = new URL(request.url).origin;
  const question = searchParams.get("q")?.trim();
  const videoId = searchParams.get("v")?.trim();

  if (!question && !videoId) {
    return Response.redirect(new URL("/gym/og-home.jpg", request.url), 302);
  }

  // ── Session card ───────────────────────────────────────────────────────
  if (videoId) {
    const context = await getTenantContext();
    const res = await context?.client.videos.get(videoId).catch(() => null);
    const video = res?.data as
      | { title?: string; playbackId?: string; duration?: number }
      | undefined;
    if (!video?.title) {
      return Response.redirect(new URL("/gym/og-home.jpg", request.url), 302);
    }

    const t = Math.max(0, parseInt(searchParams.get("t") || "", 10) || 0);
    const title = clamp(video.title, 90);
    const timecode = t ? formatTime(t) : video.duration ? formatTime(video.duration) : "";
    const frame = video.playbackId
      ? `https://image.mux.com/${video.playbackId}/thumbnail.jpg?width=1120&height=630&fit_mode=smartcrop${t ? `&time=${t}` : ""}`
      : null;

    const text = `THE GTM GAMEby FounderWellINSTANT REPLAY${title}PLAY ▶ ${timecode}1UPINSERT COINWATCH THE CLIP ▶ ${HOST}`;
    const [bungee, grotesk, osd, logo, bg, frameSrc] = await Promise.all([
      loadGoogleFont("Bungee", text),
      loadGoogleFont("Space Grotesk", text, 700),
      loadGoogleFont("VT323", text),
      loadImage(`${origin}/gym/game/logo-og.png`),
      loadImage(`${origin}/gym/og-bg.jpg`),
      frame ? loadImage(frame) : Promise.resolve(null),
    ]);

    const titleSize = title.length <= 40 ? 50 : title.length <= 70 ? 42 : 36;

    return asJpeg(new ImageResponse(
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
          {bg && (
            <img src={bg} width={WIDTH} height={HEIGHT} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
          )}

          {/* The screen, in front of the sunset */}
          <div
            style={{
              position: "absolute",
              left: 596,
              top: 128,
              width: 560,
              height: 315,
              display: "flex",
              borderRadius: 16,
              border: `3px solid ${COLORS.cyan}`,
              backgroundColor: "#000",
              overflow: "hidden",
              boxShadow: "0 0 50px rgba(34,230,255,0.55), 0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            {frameSrc && (
              <img src={frameSrc} width={560} height={315} alt="" style={{ objectFit: "cover" }} />
            )}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 560,
                height: 315,
                display: "flex",
                backgroundImage: "linear-gradient(180deg, rgba(11,6,24,0) 55%, rgba(11,6,24,0.9) 100%)",
              }}
            />
            {timecode && (
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  bottom: 12,
                  display: "flex",
                  fontFamily: "VT323",
                  fontSize: 38,
                  lineHeight: 1,
                  color: "#ffffff",
                  textShadow: "0 0 10px rgba(34,230,255,0.9)",
                }}
              >
                {`PLAY ▶ ${timecode}`}
              </div>
            )}
          </div>

          <div style={{ position: "absolute", top: 36, left: 48, display: "flex" }}>
            <Brand logo={logo} />
          </div>

          <div
            style={{
              position: "absolute",
              left: 48,
              top: 150,
              width: 500,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Bungee",
                fontSize: 22,
                lineHeight: 1,
                color: "#06121a",
                backgroundColor: COLORS.cyan,
                padding: "9px 14px",
                borderRadius: 8,
                boxShadow: `4px 4px 0 ${COLORS.pink}`,
                transform: "rotate(-2deg)",
                marginBottom: 24,
              }}
            >
              INSTANT REPLAY
            </div>
            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 48,
              bottom: 40,
              display: "flex",
              fontFamily: "VT323",
              fontSize: 32,
              color: COLORS.cyan,
            }}
          >
            {`WATCH THE CLIP ▶ ${HOST}`}
          </div>
          <Hud />
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
    ));
  }

  // ── Question card ──────────────────────────────────────────────────────
  const q = clamp(question!, 140);
  const size = q.length <= 38 ? 72 : q.length <= 70 ? 60 : q.length <= 105 ? 50 : 44;
  // Who asked: the sharer's first name when the link carries one
  const stamp = `${(sharerName(searchParams.get("by")) ?? "A founder").toUpperCase()} ASKED THE COACHES`;
  const footer = `ASK YOUR OWN ▶ ${HOST}`;
  // The coach who answered, when known: a real face on the card
  const coachSlug = COACH_SLUGS.has(searchParams.get("coach") ?? "") ? searchParams.get("coach") : null;
  const coachEntry = COACHES.find((c) => c.slug === coachSlug);
  const coachName = coachEntry ? coachLabel(coachEntry) : null;
  const text = `THE GTM GAMEby FounderWell${stamp}“${q}”${footer}1UPINSERT COIN${coachName?.toUpperCase() ?? ""}`;
  const [bungee, grotesk, grotesk500, osd, logo, coach, bg] = await Promise.all([
    loadGoogleFont("Bungee", text),
    loadGoogleFont("Space Grotesk", text, 700),
    loadGoogleFont("Space Grotesk", text, 500),
    loadGoogleFont("VT323", text),
    loadImage(`${origin}/gym/game/logo-og.png`),
    loadImage(coachSlug ? `${origin}/gym/game/cast/${coachSlug}.webp` : `${origin}/gym/game/game-master-bot-og.png`),
    loadImage(`${origin}/gym/og-bg.jpg`),
  ]);

  return asJpeg(new ImageResponse(
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
        {bg && (
          <img src={bg} width={WIDTH} height={HEIGHT} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        )}
        {coach && (
          <img
            src={coach}
            width={230}
            height={230}
            alt=""
            style={{ position: "absolute", left: 836, top: 178 }}
          />
        )}
        {coachName && (
          <div
            style={{
              position: "absolute",
              left: 836,
              top: 470,
              width: 230,
              display: "flex",
              justifyContent: "center",
              fontFamily: "Bungee",
              fontSize: 26,
              color: COLORS.chalk,
            }}
          >
            {coachName.toUpperCase()}
          </div>
        )}
        <div style={{ position: "absolute", top: 36, left: 48, display: "flex" }}>
          <Brand logo={logo} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 150,
            width: 700,
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
              marginBottom: 26,
            }}
          >
            {stamp}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: size,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {`“${q}”`}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 48,
            bottom: 40,
            display: "flex",
            fontFamily: "VT323",
            fontSize: 32,
            color: COLORS.cyan,
          }}
        >
          {footer}
        </div>
        <Hud />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        bungee && { name: "Bungee", data: bungee, weight: 400 as const, style: "normal" as const },
        grotesk && { name: "Space Grotesk", data: grotesk, weight: 700 as const, style: "normal" as const },
        grotesk500 && { name: "Space Grotesk", data: grotesk500, weight: 500 as const, style: "normal" as const },
        osd && { name: "VT323", data: osd, weight: 400 as const, style: "normal" as const },
      ].filter((f): f is NonNullable<typeof f> => Boolean(f)),
    }
  ));
}
