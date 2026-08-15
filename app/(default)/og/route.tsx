import { ImageResponse } from "next/og";
import { headers } from "next/headers";

import { getTenantContext } from "@/lib/get-tenant-context";
import { fixUploadUrl } from "@/lib/utils";
import { cssColorToHex } from "@/lib/color-utils";
import type { ExtendedMetaData } from "@/types/bold-extensions";

// Tenant depends on the request hostname in hosted mode
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

// Matches the Bold brand defaults in globals.css / theme-css.ts
const DEFAULTS = {
  background: "#fdfaf3",
  foreground: "#1c2b28",
  accent: "#14b8a6",
  mutedForeground: "#52524f",
};

interface OgTheme {
  background: string;
  foreground: string;
  accent: string;
  mutedForeground: string;
  fontHeader?: string;
}

/**
 * Pull the light-theme card colors out of tenant settings, normalized to hex
 * (satori can't parse oklch). The SDK camelizes API keys; snake_case kept as
 * fallback for raw payloads.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeFromSettings(settings: any): OgTheme {
  const theme = settings?.portal?.theme || settings?.themeConfig;
  const light = theme?.light;
  return {
    background: cssColorToHex(
      light?.background || theme?.background,
      DEFAULTS.background
    ),
    foreground: cssColorToHex(
      light?.foreground || theme?.foreground,
      DEFAULTS.foreground
    ),
    accent: cssColorToHex(light?.accent || theme?.primary, DEFAULTS.accent),
    mutedForeground: cssColorToHex(
      light?.mutedForeground || light?.muted_foreground,
      DEFAULTS.mutedForeground
    ),
    fontHeader: theme?.fontHeader || theme?.font_header,
  };
}

/**
 * Fetch a Google-hosted font as TTF for satori, subset to the rendered text.
 * Node's fetch UA gets the truetype CSS variant from the fonts API.
 */
async function loadGoogleFont(
  family: string,
  text: string
): Promise<ArrayBuffer | null> {
  // Not every family ships a 600 weight (e.g. Economica is 400/700 only);
  // an unavailable weight makes the css2 endpoint 400, so fall back to the
  // family default.
  const variants = [
    `${encodeURIComponent(family)}:wght@600`,
    encodeURIComponent(family),
  ];
  for (const variant of variants) {
    try {
      const cssUrl = `https://fonts.googleapis.com/css2?family=${variant}&text=${encodeURIComponent(
        text
      )}`;
      const css = await fetch(cssUrl).then((r) => (r.ok ? r.text() : ""));
      const match = css.match(
        /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/
      );
      if (!match) continue;
      const res = await fetch(match[1]);
      if (!res.ok) continue;
      return await res.arrayBuffer();
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Fetch the tenant logo and normalize it to a PNG data URI. Satori/resvg
 * can't decode webp/avif uploads, so everything goes through sharp (bundled
 * with Next). Returns null on any failure — the card renders without a logo.
 */
async function loadLogo(
  url: string | undefined
): Promise<{ src: string; width: number; height: number } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const { default: sharp } = await import("sharp");
    const resized = sharp(input).resize({
      height: 180,
      width: 480,
      fit: "inside",
      withoutEnlargement: false,
    });
    const { data, info } = await resized
      .png()
      .toBuffer({ resolveWithObject: true });
    return {
      src: `data:image/png;base64,${data.toString("base64")}`,
      width: info.width,
      height: info.height,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const context = await getTenantContext();
  const settings = context?.settings;
  const meta = settings?.metaData as ExtendedMetaData | undefined;

  // Top-level portal name is in the payload but not yet in the SDK types
  const portalName = (settings as { name?: string } | null | undefined)?.name;
  const name = meta?.title || portalName || "Video Portal";
  // Display host — the real request host, not x-bold-hostname (that header
  // carries the resolved tenant key, e.g. just the subdomain)
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    new URL(request.url).host;
  const theme = themeFromSettings(settings);

  const [font, logo] = await Promise.all([
    theme.fontHeader
      ? loadGoogleFont(theme.fontHeader, `${name}${host}`)
      : Promise.resolve(null),
    loadLogo(fixUploadUrl(settings?.logoUrl)),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
          // Satori reads the raw style object — an explicit `fontFamily:
          // undefined` crashes it, so the key must be absent entirely
          ...(font ? { fontFamily: '"Heading"' } : {}),
        }}
      >
        {logo && (
          <img
            src={logo.src}
            width={logo.width}
            height={logo.height}
            style={{ marginBottom: 48 }}
            alt=""
          />
        )}
        <div
          style={{
            fontSize: name.length > 28 ? 56 : 72,
            fontWeight: 600,
            color: theme.foreground,
            textAlign: "center",
            maxWidth: 1000,
            lineHeight: 1.15,
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 28,
            color: theme.mutedForeground,
          }}
        >
          {host}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 20,
            backgroundColor: theme.accent,
          }}
        />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: font
        ? [{ name: "Heading", data: font, weight: 600, style: "normal" }]
        : undefined,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
