import Link from "next/link";
import { notFound } from "next/navigation";
import { findBySlug, getAvailable, speakerLine, formatDuration, talkHref } from "@/lib/goatmire";
import { loadWatchVideo } from "@/lib/goatmire-video";
import { Header26, Temperature } from "@/components/goatmire/chrome";
import { Watch } from "@/components/goatmire/watch";
import { WatchedWord } from "@/components/goatmire/watched";

export const revalidate = 60;

function summary(text?: string | null): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 200 ? `${t.slice(0, 197).replace(/\s+\S*$/, "")}…` : t;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findBySlug(2026, slug);
  if (!found?.talk) return { title: "2026" };
  const title = `${found.talk.title}, ${speakerLine(found.talk)}`;
  const description = summary(found.talk.description) ?? `${found.day?.track ?? "Goatmire"} 2026, Varbergs Teater.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "video.other" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Watch2026({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  const found = findBySlug(2026, slug);
  if (!found) notFound();
  const summaries = await getAvailable(2026);
  const mine = summaries[slug];
  if (!mine) notFound(); // unpublished talks have no page
  const video = await loadWatchVideo(mine.uuid);
  const { talk, day } = found;

  const meta = (
    <div className="wmeta26">
      {day && <div className="wmeta">{day.track} ᛫ {day.title} ᛫ Varbergs Teater</div>}
      <h1>{talk?.title ?? video.title}</h1>
      {talk && (
        <div className="byl">
          by {speakerLine(talk)}
          {talk.speakers.some((s) => s.role) && <span>{talk.speakers.map((s) => s.role).filter(Boolean).join(" · ")}</span>}
        </div>
      )}
      {talk?.description && <p className="desc26">{talk.description}</p>}
    </div>
  );

  const others = day
    ? day.entries.flatMap((e) => (e.kind === "talk" && e.slug !== slug && summaries[e.slug] ? [e] : []))
    : [];

  const aside = day ? (
    <div>
      <h3>Also on the {day.title.replace(/ of .*/, "")}</h3>
      {others.map((e) => (
        <Link key={e.slug} href={talkHref(2026, e)} className="mini">
          {e.speakers[0]?.photo ? <img src={e.speakers[0].photo} alt="" /> : <span />}
          <span>
            <span className="ti">{e.title}</span>
            <span className="by">
              {speakerLine(e)} ᛫ {formatDuration(summaries[e.slug].duration)}{" "}
              {e.videoId && <WatchedWord videoId={e.videoId} />}
            </span>
          </span>
        </Link>
      ))}
    </div>
  ) : null;

  return (
    <div className="y26 page26 watch26">
      <Temperature />
      <Header26 />
      <div className="col wide">
        <Watch
          video={video}
          startTime={t ? Number(t) : undefined}
          dialect="y26"
          meta={meta}
          aside={aside}
          pendingText="No transcript yet."
        />
      </div>
    </div>
  );
}
