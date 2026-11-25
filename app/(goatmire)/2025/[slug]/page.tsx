import Link from "next/link";
import { notFound } from "next/navigation";
import { findBySlug, resolveUuid, getVideoSummaries, speakerLine, weekday, formatDuration, talkHref } from "@/lib/goatmire";
import { loadWatchVideo } from "@/lib/goatmire-video";
import { Header25 } from "@/components/goatmire/chrome";
import { Watch } from "@/components/goatmire/watch";
import { Watched } from "@/components/goatmire/watched";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findBySlug(2025, slug);
  if (found?.talk) return { title: `${found.talk.title}, ${speakerLine(found.talk)}` };
  return { title: found?.extra?.title ?? "2025" };
}

export default async function Watch2025({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  const found = findBySlug(2025, slug);
  if (!found) notFound();
  const uuid = found.extra?.uuid ?? (found.talk ? await resolveUuid(2025, found.talk) : null);
  if (!uuid) notFound();

  const [video, summaries] = await Promise.all([loadWatchVideo(uuid), getVideoSummaries(2025)]);
  const { talk, day } = found;
  const title = talk?.title ?? found.extra?.title ?? video.title;
  const who = talk ? speakerLine(talk) : "";

  const meta = (
    <div className="wmeta25">
      {day && talk && <div className="crumbs">{day.title} · {talk.time} · {day.track}</div>}
      <h1>{title}</h1>
      {who && <div className="who big">{who}</div>}
      {(video.description || talk?.description) && (
        <p className="desc">{video.description || talk?.description}</p>
      )}
    </div>
  );

  const aside = day ? (
    <div>
      <div className="sidehd">{weekday(day)}, in order</div>
      {day.entries.map((e) => {
        if (e.kind !== "talk") {
          return <div className="ubrk" key={`${e.time}-${e.title}`}>{e.time} · {e.title.replace(/\s*\(coffee break\)/i, "")}</div>;
        }
        const cur = e.slug === slug;
        const v = summaries[e.slug];
        return (
          <Link key={e.slug} href={talkHref(2025, e)} className={`up${cur ? " cur" : ""}`} aria-current={cur ? "page" : undefined}>
            <span className="tw">
              {v?.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" /> : <span className="noimg" />}
              {cur && <span className="eq" aria-hidden><i /><i /><i /></span>}
              {e.videoId && !cur && <Watched videoId={e.videoId} />}
            </span>
            <span>
              <span className="ut"><span className="time">{e.time}</span>{e.title}</span>
              <span className="who">{speakerLine(e)}{v ? ` · ${formatDuration(v.duration)}` : ""}</span>
            </span>
          </Link>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="y25 page25">
      <Header25 />
      <Watch
        video={video}
        startTime={t ? Number(t) : undefined}
        dialect="y25"
        meta={meta}
        aside={aside}
        pendingText="No transcript for this one yet."
      />
    </div>
  );
}
