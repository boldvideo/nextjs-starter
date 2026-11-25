import { ImageResponse } from "next/og";
import { OG_SIZE, dataUri, fonts } from "@/lib/goatmire-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Goatmire 2026, NervesConf EU and Goatmire Elixir, every talk";

export default async function Image() {
  const [bg, logo26, runes] = await Promise.all([dataUri("bg26.jpg"), dataUri("logo26.png"), dataUri("runes26.png")]);
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative" }}>
        <img src={bg} width={1200} height={630} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
          <img src={logo26} width={780} height={274} />
          <img src={runes} width={220} height={77} />
          <div style={{ fontFamily: "Fraunces", fontWeight: 300, fontSize: 36, color: "#a9cfcb", marginTop: 4 }}>
            September 28th to October 3rd, 2026 · Varberg
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() }
  );
}
