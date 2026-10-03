import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getTenantContext } from "@/lib/get-tenant-context";
import { gymVideoMeta } from "@/lib/gym-meta";
import { resolveClip } from "@/lib/gym-clip";
import { clipLabel } from "@/lib/gym-clip-window";
import { coachForVideo, coachLabel } from "@/components/gym/gym-coaches-data";
import { GymClipPlayer } from "@/components/gym/gym-clip-player";
import { GymCoachChat } from "@/components/gym/gym-coach-chat";
import { FOUNDERWELL_PROGRAM_URL } from "@/lib/gym-lead";

/**
 * One coach moment, shareable: /clip/<videoId>?t=<seconds>. Plays the clip
 * window around that second (never the whole session) and points to the
 * full session at FounderWell. Below it, chat with the coach about the
 * session (#coach). The Playbook's QR codes land here.
 */

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

async function load(id: string, tParam?: string) {
  const t = Math.max(0, parseInt(tParam ?? "0", 10) || 0);
  const context = await getTenantContext();
  if (!context) return null;
  const [video, clip] = await Promise.all([
    context.client.videos.get(id).then((r) => r.data).catch(() => null),
    resolveClip(id, t, t + 5),
  ]);
  if (!video || !clip) return null;
  return { video, clip, t };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const data = await load(id, sp.t);
  if (!data) return {};
  return gymVideoMeta(data.video, `/clip/${id}?t=${data.t}`, data.t);
}

export default async function ClipPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const data = await load(id, sp.t);
  if (!data) notFound();
  const { video, clip, t } = data;
  const coach = coachForVideo(video);

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 py-8 md:py-12">
      <p className="font-osd text-[19px] leading-none text-[var(--gym-cyan)]">
        INSTANT REPLAY ▶ {clipLabel(clip)}
      </p>

      <div className="mt-4 rounded-xl overflow-hidden border border-[var(--gym-cyan)] shadow-[0_0_40px_-10px_var(--gym-cyan)]">
        <GymClipPlayer
          moment={{ videoId: id, startMs: t * 1000, endMs: (t + 5) * 1000 }}
          playbackId={clip.playbackId}
          title={video.title}
          autoPlay={false}
          className="aspect-video"
        />
      </div>

      <h1 className="mt-6 text-[22px] md:text-[26px] font-semibold leading-snug max-w-[40ch]">{video.title}</h1>
      {/* Whose session, and where the whole thing lives: one row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {coach ? (
          <p className="flex items-center gap-2.5 text-[15px] text-muted-foreground">
            <Image src={`/gym/game/cast/${coach.slug}.webp`} alt="" width={32} height={32} className="h-8 w-8" />
            <span>
              <span className="font-semibold text-foreground">{coachLabel(coach)}</span> · {coach.title}
            </span>
          </p>
        ) : (
          <span />
        )}
        <a
          href={FOUNDERWELL_PROGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-muted-foreground hover:text-[var(--gym-cyan)]"
        >
          Full session at FounderWell
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <GymCoachChat
        videoId={video.id}
        playbackId={clip.playbackId}
        title={video.title}
        coachSlug={coach?.slug ?? null}
        coachName={coach ? coachLabel(coach) : null}
      />
    </main>
  );
}
