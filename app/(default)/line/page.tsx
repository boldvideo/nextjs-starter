import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { gymMeta } from "@/lib/gym-meta";
import { cleanLine, lineParams } from "@/lib/gym-line";
import { COACHES, coachLabel } from "@/components/gym/gym-coaches-data";
import { GymFooter } from "@/components/gym/gym-footer";
import { sharerName } from "@/lib/gym-share";

/**
 * A shared line: /line?t=<line>&c=<coach>&a=<conversation id>.
 * The card (/og/line) is what travels on LinkedIn and X; this page is where
 * the click lands: the line, whose play it is, the full answer, your turn.
 */

type Props = { searchParams: Promise<{ t?: string; c?: string; a?: string; by?: string }> };

function read(sp: { t?: string; c?: string; a?: string; by?: string }) {
  const line = cleanLine(sp.t ?? "");
  const coach = COACHES.find((c) => c.slug === sp.c) ?? null;
  const conversationId = sp.a && /^[\w-]{8,64}$/.test(sp.a) ? sp.a : null;
  // Who sent it (?by=Marcel)
  const by = sharerName(sp.by);
  return { line, coach, conversationId, by };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { line, coach, conversationId, by } = read(await searchParams);
  if (!line) return gymMeta({ title: "Say it like this" });
  const query = lineParams({ line, coach: coach?.slug, conversationId });
  const from = by ? `&by=${encodeURIComponent(by)}` : "";
  return gymMeta({
    title: `“${line}”`,
    shareTitle: `“${line}”`,
    description: `${by ? `${by} sent you ` : ""}${coach ? `${coachLabel(coach)}'s` : "The Game Master's"} play from The GTM Game: real FounderWell coaching, with the clip that backs it up.`,
    path: `/line?${query}${from}`,
    image: `/og/line?${lineParams({ line, coach: coach?.slug })}${from}`,
    imageAlt: `Say it like this: “${line}”`,
    type: "article",
  });
}

export default async function LinePage({ searchParams }: Props) {
  const { line, coach, conversationId, by } = read(await searchParams);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
    <main className="mx-auto w-full max-w-[820px] px-4 py-10 md:py-16">
      <span className="gym-slam inline-block -rotate-2 rounded-md bg-[var(--gym-pink)] px-2.5 py-1 font-display text-[13px] uppercase leading-none text-[#1a0616] shadow-[3px_3px_0_var(--gym-yellow)]">
        Say it like this
      </span>
      <blockquote className="mt-6 text-[30px] md:text-[44px] font-bold leading-[1.15] tracking-[-0.02em] text-foreground text-balance">
        {line ? <>&ldquo;{line}&rdquo;</> : "This line got lost in the arcade."}
      </blockquote>

      <p className="mt-6 flex items-center gap-3 text-[15px] text-muted-foreground">
        <Image
          src={coach ? `/gym/game/cast/${coach.slug}.webp` : "/gym/game/game-master-bot.webp"}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10"
        />
        <span>
          <span className="font-semibold text-foreground">{coach ? `${coachLabel(coach)}'s play` : "The Game Master's play"}</span>
          {coach ? ` · ${coach.title}` : " · from FounderWell's sessions"}
          {by && ` · sent by ${by}`}
        </span>
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        {conversationId && (
          <Link
            href={`/ask/${conversationId}`}
            className="inline-flex items-center h-11 px-5 rounded-xl border border-[var(--gym-line)] text-[14px] font-semibold text-foreground/90 hover:border-[var(--gym-cyan)] hover:text-[var(--gym-cyan)]"
          >
            See the full answer
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex items-center h-11 px-5 rounded-xl font-display text-[14px] uppercase text-[#1a0616] bg-[linear-gradient(90deg,var(--gym-yellow),var(--gym-orange),var(--gym-pink))]"
        >
          Ask your own question
        </Link>
      </div>
      <p className="mt-4 text-[13px] text-muted-foreground">
        The GTM Game answers from FounderWell&apos;s coaching sessions and shows you the clip that backs it up.
      </p>
    </main>
    <GymFooter />
    </div>
  );
}
