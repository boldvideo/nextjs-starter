import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoastResult } from "@/components/gym/gym-roast";
import { gymMeta } from "@/lib/gym-meta";
import { rankFor } from "@/lib/gym-roast";
import { loadRoast } from "@/lib/gym-roast-load";

/**
 * A finished roast, shareable: the score, the verdict, the hits with their
 * clips, the fix. The share card shows the score and verdict only; the pitch
 * sits collapsed under "The original" (open for the person who wrote it).
 */

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const loaded = await loadRoast(id);
  if (!loaded || loaded.roast.score === null) return gymMeta({ title: "Roast my pitch", path: "/roast" });
  const { score, verdict } = loaded.roast;
  const rank = rankFor(score);
  return {
    ...gymMeta({
      title: `Pitch roasted: ${score}/100`,
      shareTitle: `My pitch scored ${score}/100: ${rank.label}`,
      description: verdict || "Roasted by the Game Master, judged by FounderWell's coaches. Roast yours.",
      path: `/roast/${id}`,
      image: `/roast/${id}/og`,
      imageAlt: `Reply score ${score} out of 100: ${rank.label}`,
      type: "article",
    }),
    robots: { index: false },
  };
}

export default async function RoastResultPage({ params }: Props) {
  const { id } = await params;
  const loaded = await loadRoast(id);
  if (!loaded) notFound();
  return (
    <div className="flex-1 overflow-y-auto">
      <RoastResult text={loaded.text} sources={loaded.sources} pitch={loaded.pitch} kind={loaded.kind} conversationId={id} />
    </div>
  );
}
