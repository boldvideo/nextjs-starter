import Link from "next/link";
import { PROGRAMMES, getAvailable, formatDuration, speakerLine, talkHref, thumb2026, type TalkEntry } from "@/lib/goatmire";
import { Header26, Temperature } from "@/components/goatmire/chrome";
import { Watched } from "@/components/goatmire/watched";

export const revalidate = 60;
export const metadata = {
  title: "2026",
  description: "NervesConf EU & Goatmire Elixir, September 28th to October 3rd 2026, Varberg. The talks, as they are published.",
  openGraph: { title: "Goatmire 2026", description: "NervesConf EU & Goatmire Elixir, September 28th to October 3rd 2026, Varberg." },
};

export default async function Index2026() {
  const videos = await getAvailable(2026);
  const days = PROGRAMMES[2026].days;

  return (
    <div className="y26 page26">
      <Temperature />
      <Header26 />
      <div className="gallery26">
        <div className="intro26">
          <img src="/goatmire/runes26.svg" alt="ᛁᛚᛁᚴᛋᛁᛦ" className="runes" />
          <p className="when">September 28th to October 3rd, 2026 · Varberg, Sweden</p>
        </div>
        {days.map((day) => {
          const talks = day.entries.filter((e): e is TalkEntry => e.kind === "talk");
          return (
            <section key={day.id} id={day.id} className="day26">
              <header>
                <h2>{day.title}</h2>
                <span className="kicker">{day.track}</span>
              </header>
              <div className="grid26">
                {talks.map((e) => {
                  const v = videos[e.slug];
                  const inner = (
                    <>
                      <span className="thumb">
                        <img src={thumb2026(e.slug, v?.thumbnail)} alt="" loading="lazy" />
                        {v ? (v.duration > 0 && <span className="dur">{formatDuration(v.duration)}</span>) : <span className="soon">Soon</span>}
                        {v && <Watched videoId={v.id} />}
                      </span>
                      <span className="t">{e.title}</span>
                      <span className="who">{speakerLine(e)}</span>
                    </>
                  );
                  return v ? (
                    <Link className="c26" key={e.slug} href={talkHref(2026, e)}>{inner}</Link>
                  ) : (
                    <div className="c26 off" key={e.slug}>{inner}</div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
