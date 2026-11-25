import { talkCard } from "@/lib/goatmire-card";
import { talks } from "@/lib/goatmire";

export const runtime = "nodejs";
// Built once per talk at deploy time; the design does not change per request.
export const dynamic = "force-static";

export function generateStaticParams() {
  return talks(2026).map((t) => ({ slug: t.slug }));
}

/** 16:9 thumbnail for the 2026 gallery and player poster. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await talkCard(slug, 675, { compact: true });
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  return res;
}
