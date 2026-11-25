import Link from "next/link";
import { notFound } from "next/navigation";
import { findBySlug, getAvailable, speakerLine, weekday, formatDuration, talkHref } from "@/lib/goatmire";
import { loadWatchVideo } from "@/lib/goatmire-video";
import { Header25 } from "@/components/goatmire/chrome";
import { Watch } from "@/components/goatmire/watch";
import { Watched } from "@/components/goatmire/watched";

export const revalidate = 60;

function summary(text?: string | null): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 200 ? `${t.slice(0, 197).replace(/\s+\S*$/, "")}…` : t;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findBySlug(2025, slug);
  if (!found) return { title: "2025" };
  const title = found.talk ? `${found.talk.title}, ${speakerLine(found.talk)}` : found.extra?.title ?? "2025";
  const description = summary(found.talk?.description) ?? "Goatmire Elixir 2025, Varbergs Teater.";
  // Lars designed a card for every 2025 talk; that is the share image.
  const available = await getAvailable(2025);
  const thumb = available[slug]?.thumbnail;
  const images = thumb ? [{ url: thumb, width: 1280, height: 720, alt: title }] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "video.other", images },
    twitter: { card: "summary_large_image", title, description, images: thumb ? [thumb] : undefined },
  };
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
  const summaries = await getAvailable(2025);
  const mine = summaries[slug];
  if (!mine) notFound(); // unpublished talks have no page
  const video = await loadWatchVideo(mine.uuid);
  const { talk, day } = found;
  const title = talk?.title ?? found.extra?.title ?? video.title;
  const who = talk ? speakerLine(talk) : "";

  const meta = (
    <div className="wmeta25">
      {day && talk && <div className="crumbs">{day.title} · {day.track}</div>}
      <h1>{title}</h1>
      {who && <div className="who big">{who}</div>}
      {(video.description || talk?.description) && (
        <p className="desc">{video.description || talk?.description}</p>
      )}
    </div>
  );

  const aside = day ? (
    <div>
      <div className="sidehd">{weekday(day)}</div>
      {day.entries.map((e) => {
        if (e.kind !== "talk") return null;
        const cur = e.slug === slug;
        const v = summaries[e.slug];
        if (!v) {
          return (
            <div key={e.slug} className="up off">
              <span className="tw"><span className="noimg" /></span>
              <span>
                <span className="ut">{e.title}</span>
                <span className="who">{speakerLine(e)}</span>
              </span>
            </div>
          );
        }
        return (
          <Link key={e.slug} href={talkHref(2025, e)} className={`up${cur ? " cur" : ""}`} aria-current={cur ? "page" : undefined}>
            <span className="tw">
              {v.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" /> : <span className="noimg" />}
              {cur && <span className="eq" aria-hidden><i /><i /><i /></span>}
              {!cur && <Watched videoId={v.id} />}
            </span>
            <span>
              <span className="ut">{e.title}</span>
              <span className="who">{speakerLine(e)} · {formatDuration(v.duration)}</span>
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
