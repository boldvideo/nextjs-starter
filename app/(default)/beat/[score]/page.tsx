import type { Metadata } from "next";
import { gymMeta } from "@/lib/gym-meta";
import { challengeLanding, cleanInitials, cleanScore, pipeline } from "@/components/gym/dodger/challenge";
import { ChallengeRedirect } from "@/components/gym/dodger/challenge-redirect";

/**
 * A Dodger challenge link: /beat/4200?by=MF. Unfurls with its own card
 * ("Beat $4,200 on the secret level"), then drops the player into today's
 * daily run with the invitation. The Konami code is never part of it.
 */

type Props = { params: Promise<{ score: string }>; searchParams: Promise<{ by?: string }> };

async function read({ params, searchParams }: Props) {
  const [{ score }, sp] = await Promise.all([params, searchParams]);
  return { beat: cleanScore(score), by: cleanInitials(sp.by) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { beat, by } = await read(props);
  if (!beat) return gymMeta({ title: "The secret level", path: "/" });
  const who = by ? `${by} scored` : "Someone scored";
  return gymMeta({
    title: `Beat ${pipeline(beat)} on the secret level`,
    shareTitle: `Beat ${pipeline(beat)} on the secret level`,
    description: `${who} ${pipeline(beat)} in Objection Dodger, The GTM Game's hidden cabinet. Today's run is waiting. The code? Find it yourself.`,
    path: `/beat/${beat}${by ? `?by=${by}` : ""}`,
    image: `/og/challenge?beat=${beat}${by ? `&by=${by}` : ""}`,
    imageAlt: `Beat ${pipeline(beat)} on the secret level. The GTM Game, play.founderwell.com`,
  });
}

export default async function BeatPage(props: Props) {
  const { beat, by } = await read(props);
  const to = beat ? challengeLanding({ beat, by }) : "/?play=daily";
  return (
    <main className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <p className="font-osd text-[20px] text-[var(--gym-cyan)] gym-blink">LOADING THE SECRET LEVEL…</p>
      {beat && <p className="mt-3 font-display text-[28px] gym-sunset-text">BEAT {pipeline(beat)}</p>}
      <ChallengeRedirect to={to} />
      <noscript>
        <a href={to} className="mt-6 inline-block underline">Press start</a>
      </noscript>
    </main>
  );
}
