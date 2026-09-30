import type { Metadata } from "next";
import { gymMeta } from "@/lib/gym-meta";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!q) return gymMeta({ title: "Press start", path: "/ask" });

  return gymMeta({
    title: q,
    shareTitle: `“${q}” — The GTM Game`,
    description: "Ask the GTM Game master: a game plan with proof from FounderWell sessions.",
    path: `/ask?q=${encodeURIComponent(q)}`,
    image: `/og?q=${encodeURIComponent(q)}`,
    imageAlt: `The GTM Game: “${q}”`,
  });
}

// Rendered by app/(default)/ask/layout.tsx
export default function AskPage() {
  return null;
}
