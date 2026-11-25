import Link from "next/link";
import { PROGRAMMES, getVideoSummaries, formatDuration, speakerLine, talkHref } from "@/lib/goatmire";
import { Header25 } from "@/components/goatmire/chrome";
import { Watched } from "@/components/goatmire/watched";

export const revalidate = 300;
export const metadata = { title: "2025" };

const SUMMARY_ID = "w73xw"; // progress key for the summary film

export default async function Index2025() {
  const videos = await getVideoSummaries(2025);
  const summaryDuration = videos["in-summary"]?.duration ?? 390;

  return (
    <div className="y25 page25">
      <div className="curtainwash" aria-hidden />
      <Header25 active="talks" />
      <section className="hero25">
        <Link href="/2025/in-summary" className="feat">
          <img src="https://uploads.eu1.boldvideo.io/uploads/bt_goatmire/thumbnails/712f9896-c97a-4dc7-b35d-c285d8a4c970.jpg" alt="Goatmire Elixir 2025, in summary" />
          <span className="play"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
          <span className="dur">{formatDuration(summaryDuration)}</span>
          <Watched videoId={SUMMARY_ID} />
        </Link>
        <div className="intro">
          <h1>What was this?</h1>
          <p>The conference is done.</p>
          <p>If you were there, you know what it was.</p>
          <p>If you weren’t, it’s all here.</p>
          <div className="meta"><span>10–12 September 2025</span><span>Varbergs Teater</span><span>{PROGRAMMES[2025].days.reduce((n, d) => n + d.entries.filter((e) => e.kind === "talk").length, 0)} talks</span></div>
          <p className="featlbl"><span className="rs">In summary</span> six and a half minutes of it, with live-coded music by Sam Aaron.</p>
        </div>
      </section>

      {PROGRAMMES[2025].days.map((day) => (
        <section className="day" key={day.id} id={day.id}>
          <header>
            <h2>{day.title}</h2>
            <span className="track">{day.track}</span>
            <span className="n">{day.entries.filter((e) => e.kind === "talk").length} talks</span>
          </header>
          <div className="grid25">
            {day.entries.map((e, i) => {
              if (e.kind !== "talk") {
                return (
                  <div className={`brk ${e.kind}`} key={i}>
                    <span className="time">{e.time}</span>
                    <b>{e.title.replace(/\s*\(coffee break\)/i, "")}</b>
                  </div>
                );
              }
              const v = videos[e.slug];
              return (
                <Link className="c25" key={i} href={talkHref(2025, e)}>
                  <span className="thumb">
                    {v?.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" /> : <span className="noimg" />}
                    {v && <span className="dur">{formatDuration(v.duration)}</span>}
                    {v && <Watched videoId={v.id} />}
                  </span>
                  <span className="t"><span className="time">{e.time}</span>{e.title}</span>
                  <span className="who">{speakerLine(e)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="f25">
        <span>Aspire. Perspire. Goatmire. .. Rewatch.</span>
        <span>Goatmire Elixir &amp; NervesConf EU, 2025</span>
      </footer>
    </div>
  );
}
