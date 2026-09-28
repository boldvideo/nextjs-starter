import { Bungee, Space_Grotesk, VT323 } from "next/font/google";

// GTM Gym fork: only the three faces the skin uses, preloaded. The shared
// lib/fonts.ts registry declares ~20 tenant-selectable families and none of
// them preload, so the Bungee headline used to swap in late.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bungee",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt323",
  display: "swap",
});

export const gymFontVariables = [spaceGrotesk, bungee, vt323]
  .map((f) => f.variable)
  .join(" ");
