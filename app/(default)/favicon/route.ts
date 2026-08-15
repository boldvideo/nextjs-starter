import { getTenantContext } from "@/lib/get-tenant-context";
import { fixUploadUrl } from "@/lib/utils";

// Tenant depends on the request hostname in hosted mode
export const dynamic = "force-dynamic";

/**
 * Tenant favicon at /favicon: serves the uploaded favicon if set, otherwise
 * derives one from the header logo. Logos arrive as webp/svg/wide wordmarks,
 * so everything is normalized to a square PNG (transparent padding) through
 * sharp — the same approach as the /og card. Falls back to the static
 * Bold favicon when the tenant has neither.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = parseInt(searchParams.get("size") || "", 10);
  const size = Math.min(512, Math.max(16, requested || 64));

  const context = await getTenantContext();
  const settings = context?.settings;
  const src =
    fixUploadUrl(settings?.faviconUrl) || fixUploadUrl(settings?.logoUrl);

  if (src) {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const input = Buffer.from(await res.arrayBuffer());
      const { default: sharp } = await import("sharp");
      const png = await sharp(input)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      return new Response(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control":
            "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    } catch {
      // fall through to the static favicon
    }
  }

  return Response.redirect(new URL("/favicon.ico", request.url), 307);
}
