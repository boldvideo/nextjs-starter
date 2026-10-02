import { ImageResponse } from "next/og";
import { GYM_PUBLIC_HOST } from "@/lib/gym-meta";
import { COACHES } from "@/components/gym/gym-coaches-data";

/**
 * Share card for a Playbook: /plan/<id>/og?q=<question>&c=<coach slugs>.
 * Paper, not night: it reads as the game-manual cover next to the dark
 * answer cards. The question is set in Bungee, screen-printed slightly off
 * register (like the Playbook headline); the coaches whose sessions back it
 * sit on the right. Bottom-left stays clear for X's domain overlay.
 *
 * Satori can't decode webp, so coach portraits go through sharp first.
 * JPEG via sharp keeps it under WhatsApp's ~300KB preview limit.
 */

const WIDTH = 1200;
const HEIGHT = 630;

const C = {
  paper: "#fdfbf6",
  ink: "#17121f",
  soft: "#5b5368",
  pink: "#d6187f",
  cyan: "#0a8fb0",
  orange: "#f07a12",
  yellow: "#f5c21b",
};

const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const SUNSET = `linear-gradient(90deg, ${C.yellow}, ${C.orange} 38%, ${C.pink})`;

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

/** Any image (webp included) as a PNG data URL satori can draw. */
async function loadPng(url: string, size?: number): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const { default: sharp } = await import("sharp");
    let img = sharp(Buffer.from(await res.arrayBuffer()));
    if (size) img = img.resize(size, size);
    const png = await img.png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
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

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const question = clamp(searchParams.get("q") || "Your next go-to-market move", 110).toUpperCase();
  const coaches = (searchParams.get("c") || "")
    .split(",")
    .map((slug) => COACHES.find((c) => c.slug === slug))
    .filter((c): c is (typeof COACHES)[number] => Boolean(c))
    .slice(0, 2);

  const size = question.length <= 34 ? 72 : question.length <= 60 ? 62 : question.length <= 85 ? 52 : 44;
  const credit = coaches.length ? `FROM ${coaches.map((c) => c.name.split(" ")[0]).join(" & ")}'S SESSIONS`.toUpperCase() : "";
  const host = GYM_PUBLIC_HOST.toUpperCase();
  const text = `THE GTM GAMEPLAYBOOKBY FOUNDERWELL${question}${credit}THE MOVES · THE WORDS · THE CLIPS${host}`;

  const [bungee, grotesk, osd, logo, ...faces] = await Promise.all([
    loadGoogleFont("Bungee", text),
    loadGoogleFont("Space Grotesk", text, 700),
    loadGoogleFont("VT323", text),
    loadPng(`${origin}/gym/game/logo-og.png`, 96),
    ...coaches.map((c) => loadPng(`${origin}/gym/game/cast/${c.slug}.webp`, 200)),
  ]);

  return asJpeg(
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            backgroundColor: C.paper,
            fontFamily: "Space Grotesk",
            color: C.ink,
          }}
        >
          <div style={{ display: "flex", height: 18, width: "100%", backgroundImage: SUNSET }} />

          {/* Masthead */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 56px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {logo && <img src={logo} width={72} height={72} alt="" />}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontFamily: "Bungee", fontSize: 30, lineHeight: 1 }}>THE GTM GAME</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 20, fontWeight: 700, color: C.soft }}>BY FOUNDERWELL</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Bungee",
                fontSize: 34,
                lineHeight: 1,
                color: C.paper,
                backgroundColor: C.pink,
                padding: "12px 20px",
                borderRadius: 10,
                boxShadow: `5px 5px 0 ${C.yellow}`,
                transform: "rotate(-3deg)",
              }}
            >
              PLAYBOOK
            </div>
          </div>

          {/* The question, off register; the coaches on the right */}
          <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 56px" }}>
            <div
              style={{
                display: "flex",
                width: coaches.length ? 760 : 1088,
                fontFamily: "Bungee",
                fontSize: size,
                lineHeight: 1.08,
                color: C.ink,
                textShadow: `0.06em 0.045em 0 rgba(10,143,176,0.55), -0.035em -0.025em 0 rgba(214,24,127,0.4)`,
              }}
            >
              {question}
            </div>
            {coaches.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: "auto", width: 280 }}>
                <div style={{ display: "flex" }}>
                  {faces.map((f, i) =>
                    f ? (
                      <img
                        key={i}
                        src={f}
                        width={coaches.length > 1 ? 150 : 190}
                        height={coaches.length > 1 ? 150 : 190}
                        alt=""
                        style={{ marginLeft: i ? -26 : 0, borderRadius: 999, border: `5px solid ${C.paper}` }}
                      />
                    ) : null
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 16,
                    fontFamily: "VT323",
                    fontSize: 32,
                    lineHeight: 1.05,
                    color: C.soft,
                    textAlign: "center",
                    justifyContent: "center",
                  }}
                >
                  {credit}
                </div>
              </div>
            )}
          </div>

          {/* Footer: left kept clear for X's domain label */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 28, padding: "0 56px 34px" }}>
            <div style={{ display: "flex", fontFamily: "VT323", fontSize: 32, color: C.soft }}>THE MOVES · THE WORDS · THE CLIPS</div>
            <div style={{ display: "flex", fontFamily: "VT323", fontSize: 36, color: C.cyan }}>{host}</div>
          </div>
          <div style={{ display: "flex", height: 18, width: "100%", backgroundImage: SUNSET }} />
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
