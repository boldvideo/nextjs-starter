import { ImageResponse } from "next/og";
import { findBySlug, speakerLine } from "@/lib/goatmire";
import { OG_SIZE, dataUri, fonts, speakerPhoto, slugify } from "@/lib/goatmire-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A talk from Goatmire 2026";

/** Tall condensed caps sized to the title; the last word burns. */
function titleSize(title: string): number {
  const n = title.length;
  if (n <= 12) return 118;
  if (n <= 22) return 96;
  if (n <= 34) return 78;
  if (n <= 50) return 64;
  return 54;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findBySlug(2026, slug);
  const talk = found?.talk;
  const title = talk?.title ?? "Goatmire 2026";
  const who = talk ? speakerLine(talk) : "";
  const role = talk?.speakers.map((s) => s.role).filter(Boolean)[0] ?? "";
  const day = found?.day;

  const words = title.split(/\s+/);
  const head = words.slice(0, -1).join(" ");
  const last = words[words.length - 1];

  const [bg, logo26, photo] = await Promise.all([
    dataUri("bg26-talk.jpg"),
    dataUri("logo26.png"),
    talk ? speakerPhoto(slugify(talk.speakers[0].name)) : Promise.resolve(null),
  ]);
  const meta = [role.length > 46 ? "" : role, day ? `${day.track}, ${day.title}` : ""].filter(Boolean);
  const full = { position: "absolute" as const, top: 0, left: 0, width: 1200, height: 630, display: "flex" };

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative" }}>
        <img src={bg} width={1200} height={630} />
        {photo && (
          <div style={{ position: "absolute", top: 0, left: 560, width: 640, height: 630, display: "flex" }}>
            <img src={photo} width={640} height={640} style={{ position: "absolute", top: -5, left: 0 }} />
            {/* colour photograph, fading into the dark middle on the left */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 640, height: 630, display: "flex", background: "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 20%, rgba(0,0,0,0) 55%)" }} />
          </div>
        )}

        <div style={{ ...full, width: 260, height: 100, left: 64, top: 54 }}>
          <img src={logo26} width={240} height={84} />
        </div>

        <div style={{ position: "absolute", left: 64, bottom: 58, width: 640, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontFamily: "BricolageCond",
              fontWeight: 800,
              fontSize: titleSize(title),
              lineHeight: 0.95,
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            {head && <span style={{ marginRight: 18 }}>{head}</span>}
            <span style={{ color: "#ff914d" }}>{last}</span>
          </div>
          {who && (
            <div style={{ fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 300, fontSize: 38, color: "#d8ecea", marginTop: 24 }}>
              {who}
            </div>
          )}
          {meta.map((line) => (
            <div key={line} style={{ fontFamily: "Fraunces", fontWeight: 300, fontSize: 22, color: "#8fb3b0", marginTop: 6 }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() }
  );
}
