import Image from "next/image";
import Link from "next/link";
import type { Video } from "@boldvideo/bold-js";
import { getTenantContext } from "@/lib/get-tenant-context";
import { gymMeta } from "@/lib/gym-meta";
import { GymBackdrop } from "@/components/gym/gym-backdrop";
import { BoldChannelForm } from "@/components/gym/bold-channel-form";

export const revalidate = 3600;

export const metadata = gymMeta({
  title: "How we built The GTM Game",
  description:
    "Bold turned FounderWell's coaching library into an AI that answers go-to-market questions and shows the exact minute of video behind every answer.",
  path: "/built-by-bold",
});

const STEPS = [
  {
    title: "Every session, indexed to the second",
    body: "Bold transcribes FounderWell's coaching sessions, finds the speakers and topics, and makes every moment searchable.",
  },
  {
    title: "You ask, it finds the moments",
    body: "Your question goes to the sessions, not the open internet. The AI writes a short game plan grounded only in what the coaches said.",
  },
  {
    title: "Every claim comes with the clip",
    body: "Each point links to the exact minute of video it came from, so you can hear it from the coach and check it yourself.",
  },
];

/**
 * Bold's lane on FounderWell's site: what this is, how it works, and one
 * ask. The channel form is Bold's own (Loops, Bold consent), never the
 * FounderWell coin.
 */
export default async function BuiltByBoldPage() {
  const context = await getTenantContext();
  let videos: Video[] = [];
  try {
    videos = (await context?.client.videos.list({ page: 1 }))?.data ?? [];
  } catch {
    /* stats are decoration */
  }
  const hours = Math.round(videos.reduce((sum, v) => sum + (v.duration || 0), 0) / 3600);

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto">
      <GymBackdrop variant="dim" />
      <article className="relative max-w-[760px] mx-auto px-4 md:px-6 py-14 md:py-20">
        <p className="font-osd text-[20px] text-[var(--gym-cyan)] uppercase">Built by Bold</p>
        <h1 className="mt-2 font-bold text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-balance">
          How we built The GTM Game
        </h1>
        <p className="mt-5 text-lg md:text-xl leading-relaxed text-foreground/85 text-pretty">
          ChatGPT knows a little about everything. This knows what FounderWell&apos;s coaches actually teach:{" "}
          {videos.length > 0 ? (
            <strong className="text-foreground">
              {videos.length} sessions, {hours} hours of video
            </strong>
          ) : (
            "their whole library"
          )}
          , turned into an AI that answers your go-to-market question and shows you the minute it came from.
        </p>

        <ol className="mt-12 space-y-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[48px_1fr] gap-4">
              <span className="font-display text-[30px] leading-none text-transparent [-webkit-text-stroke:1.5px_var(--gym-cyan)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-bold text-[20px] md:text-[22px] leading-snug">{step.title}</h2>
                <p className="mt-1.5 text-[16.5px] leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-14">
          <h2 className="font-bold text-[22px] md:text-[26px] leading-snug">Why FounderWell</h2>
          <p className="mt-3 text-[16.5px] leading-relaxed text-foreground/85">
            Full disclosure: I&apos;m a partner in FounderWell. We built The GTM Game for our own program first, because a
            library of great coaching sessions is only useful if founders can find the minute they need. If it works for
            us, it works for you.
          </p>
        </section>

        <div className="mt-10 rounded-2xl border border-[var(--gym-line)] bg-[color-mix(in_srgb,var(--gym-panel)_92%,transparent)] p-6 md:p-8">
          <div className="flex items-center gap-4">
            <Image src="/gym/game/cast/marcel.webp" alt="Marcel Fahle" width={96} height={96} className="h-16 w-16 shrink-0" />
            <div>
              <p className="font-bold text-[20px] leading-snug">Have a video library? Send us your channel and we&apos;ll build yours.</p>
              <p className="mt-1 text-[15px] text-muted-foreground">Marcel Fahle, Bold</p>
            </div>
          </div>
          <div className="mt-5">
            <BoldChannelForm />
          </div>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/" className="font-semibold text-foreground/85 hover:text-[var(--gym-cyan)]">
            ← Back to the game
          </Link>
          <span className="mx-2">·</span>
          <a href="https://www.boldvideo.com?utm_source=gtm-game&utm_medium=built-by-bold" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            boldvideo.com
          </a>
        </p>
      </article>
    </div>
  );
}
