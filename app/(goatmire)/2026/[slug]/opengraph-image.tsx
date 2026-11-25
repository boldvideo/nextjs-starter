import { talkCard } from "@/lib/goatmire-card";
import { OG_SIZE } from "@/lib/goatmire-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A talk from Goatmire 2026";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return talkCard(slug);
}
