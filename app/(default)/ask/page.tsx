import type { Metadata } from "next";
import { gymMeta } from "@/lib/gym-meta";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!q) return gymMeta({ title: "Ask the coach", path: "/ask" });

  return gymMeta({
    title: q,
    shareTitle: `“${q}” — The GTM Gym`,
    description: "Ask the GTM Gym coach: a training plan with proof from FounderWell sessions.",
    path: `/ask?q=${encodeURIComponent(q)}`,
    image: `/og?q=${encodeURIComponent(q)}`,
    imageAlt: `The GTM Gym: “${q}”`,
  });
}

// Rendered by app/(default)/ask/layout.tsx
export default function AskPage() {
  return null;
}
