import { ImageResponse } from "next/og";
import { OG_SIZE, dataUri, fonts } from "@/lib/goatmire-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Goatmire Elixir & NervesConf EU 2025, every talk";

export default async function Image() {
  const [bg, logo25] = await Promise.all([dataUri("bg25.jpg"), dataUri("logo25.png")]);
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative" }}>
        <img src={bg} width={1200} height={630} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
          <img src={logo25} width={840} height={256} />
          <div style={{ display: "flex", gap: 22, alignItems: "baseline", marginTop: 10 }}>
            <div style={{ fontFamily: "Economica", fontWeight: 700, fontSize: 46, color: "#fff" }}>10–12 September 2025</div>
            <div style={{ fontFamily: "Economica", fontWeight: 700, fontSize: 46, color: "#8a93b5" }}>Varbergs Teater</div>
          </div>
          <div style={{ fontFamily: "RockSalt", fontSize: 30, color: "#ff00ff", transform: "rotate(-3deg)" }}>NervesConf EU</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() }
  );
}
