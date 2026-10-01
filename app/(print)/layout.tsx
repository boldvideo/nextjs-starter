import type { Metadata } from "next";
import { Bungee, Caveat, Space_Grotesk, VT323 } from "next/font/google";
import "./print.css";
import { GYM_BASE_URL, GYM_PLAUSIBLE_ID } from "@/lib/gym-meta";
import { Analytics } from "@/components/analytics";

// The printable plan is its own root layout: no gym bar, no chat, just paper.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-space-grotesk", display: "swap" });
const bungee = Bungee({ subsets: ["latin"], weight: "400", variable: "--font-bungee", display: "swap" });
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt323", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(GYM_BASE_URL),
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${bungee.variable} ${vt323.variable} ${caveat.variable}`}>
      <body>
        <Analytics config={{ provider: "plausible", id: GYM_PLAUSIBLE_ID }} />
        {children}
      </body>
    </html>
  );
}
