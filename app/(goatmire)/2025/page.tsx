import Link from "next/link";
import { PROGRAMMES, getAvailable, formatDuration, speakerLine, talkHref, type TalkEntry } from "@/lib/goatmire";
import { Header25 } from "@/components/goatmire/chrome";
import { Watched } from "@/components/goatmire/watched";

export const revalidate = 60;
export const metadata = {
  title: "2025",
  description: "Goatmire Elixir & NervesConf EU, 10–12 September 2025, Varbergs Teater. Every talk.",
  openGraph: { title: "Goatmire Elixir & NervesConf EU 2025", description: "10–12 September 2025, Varbergs Teater. Every talk." },
};

export default async function Index2025() {
  const videos = await getAvailable(2025);
  const days = PROGRAMMES[2025].days;
  const summary = videos["in-summary"];

  return (
    <div className="y25 page25">
      <div className="curtainwash" aria-hidden />
      <Header25 />
      {days.map((day, di) => {
        const talks = day.entries.filter((e): e is TalkEntry => e.kind === "talk");
        const isLast = di === days.length - 1;
        return (
          <section className="day" key={day.id} id={day.id}>
            <header>
              <h2>{day.title}</h2>
              <span className="track">{day.track}</span>
            </header>
            <div className="grid25">
              {talks.map((e) => {
                const v = videos[e.slug];
                const inner = (
                  <>
                    <span className="thumb">
                      {v?.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" /> : <span className="noimg" />}
                      {v && v.duration > 0 && <span className="dur">{formatDuration(v.duration)}</span>}
                      {v && <Watched videoId={v.id} />}
                    </span>
                    <span className="t">{e.title}</span>
                    <span className="who">{speakerLine(e)}</span>
                  </>
                );
                return v ? (
                  <Link className="c25" key={e.slug} href={talkHref(2025, e)}>{inner}</Link>
                ) : (
                  <div className="c25 off" key={e.slug}>{inner}</div>
                );
              })}
              {isLast && summary && (
                <Link className="c25" href="/2025/in-summary">
                  <span className="thumb">
                    {summary.thumbnail ? <img src={summary.thumbnail} alt="" loading="lazy" /> : <span className="noimg" />}
                    <span className="dur">{formatDuration(summary.duration)}</span>
                    <Watched videoId={summary.id} />
                  </span>
                  <span className="t">In Summary</span>
                  <span className="who">Goatmire Elixir 2025</span>
                </Link>
              )}
            </div>
          </section>
        );
      })}
      <footer className="f25">
        <span>Goatmire Elixir &amp; NervesConf EU, 10–12 September 2025, Varbergs Teater</span>
      </footer>
    </div>
  );
}
