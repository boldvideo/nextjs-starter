import { ImageResponse } from "next/og";
import { OG_SIZE, dataUri, fonts } from "@/lib/goatmire-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Goatmire Elixir 2025 and Goatmire 2026, the talks";

export default async function Image() {
  const [bg25, bg26, logo25, logo26, runes] = await Promise.all([
    dataUri("bg25-half.jpg"),
    dataUri("bg26-half.jpg"),
    dataUri("logo25.png"),
    dataUri("logo26.png"),
    dataUri("runes26.png"),
  ]);
  const half = { position: "absolute" as const, top: 0, width: 600, height: 630, display: "flex" };
  const center = { position: "absolute" as const, top: 0, left: 0, width: 600, height: 630, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center" };
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: "#000" }}>
        <div style={{ ...half, left: 0 }}>
          <img src={bg25} width={600} height={630} />
          <div style={{ ...center, gap: 26 }}>
            <div style={{ fontFamily: "Economica", fontWeight: 700, fontSize: 38, color: "#8a93b5" }}>10–12 September 2025</div>
            <img src={logo25} width={480} height={146} />
          </div>
        </div>
        <div style={{ ...half, left: 600 }}>
          <img src={bg26} width={600} height={630} />
          <div style={{ ...center, gap: 22 }}>
            <div style={{ fontFamily: "Fraunces", fontWeight: 300, fontSize: 32, color: "#a9cfcb" }}>28 September – 3 October 2026</div>
            <img src={logo26} width={450} height={158} />
            <img src={runes} width={150} height={53} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 600, top: 70, width: 1, height: 490, display: "flex", background: "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))" }} />
        <div style={{ position: "absolute", top: 36, left: 0, width: 1200, display: "flex", justifyContent: "center", fontFamily: "Bricolage", fontWeight: 500, fontSize: 18, letterSpacing: 4, color: "rgba(255,255,255,0.5)" }}>
          VARBERGS TEATER, VARBERG
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() }
  );
}
