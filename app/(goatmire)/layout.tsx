import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Bricolage_Grotesque,
  Economica,
  Rock_Salt,
  Poppins,
  Fraunces,
} from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@/components/analytics";
import { getTenantContext } from "@/lib/get-tenant-context";
import { BoldProvider } from "@/components/providers/bold-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { searchIndex } from "@/lib/goatmire";
import { GoatSearch } from "@/components/goatmire/search";
import "@boldvideo/player/styles.css";
import "./goatmire.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
  variable: "--g-bricolage",
  display: "swap",
});
const economica = Economica({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--g-economica",
  display: "swap",
});
const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  variable: "--g-rocksalt",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400"],
  variable: "--g-poppins",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--g-fraunces",
  display: "swap",
});

// Plausible site script id for video.goatmire.com (public; it ships in the page).
const PLAUSIBLE_ID = "pa--k-vCSLuiP9Ajb5GdGTkE";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Social images must resolve on whichever host serves the page
  // (goatmire-v2.bold.video now, video.goatmire.com later).
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const base = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_BASE_URL;
  const description = "Every talk from Goatmire Elixir and NervesConf EU, recorded at Varbergs Teater.";
  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { default: "Goatmire videos", template: "%s · Goatmire" },
    description,
    openGraph: { siteName: "Goatmire", type: "website", title: "Goatmire videos", description },
    twitter: { card: "summary_large_image" },
    // Staging hosts (goatmire-v2.bold.video) stay out of search results.
    robots: process.env.GOATMIRE_NOINDEX === "1" ? { index: false, follow: false } : undefined,
  };
}

export default async function GoatmireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantContext();
  const fonts = [bricolage, economica, rockSalt, poppins, fraunces]
    .map((f) => f.variable)
    .join(" ");

  return (
    <html lang="en" className={fonts}>
      <body className="g-body">
        <Analytics config={{ provider: "plausible", id: PLAUSIBLE_ID }} />
        <BoldProvider
          token={context?.tenantToken ?? ""}
          baseURL={process.env.BACKEND_URL || "https://app.boldvideo.io/api/v1"}
        >
          <SettingsProvider settings={context?.settings ?? null}>
            <ProgressProvider>
              {children}
              <GoatSearch index={searchIndex()} />
            </ProgressProvider>
          </SettingsProvider>
        </BoldProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
