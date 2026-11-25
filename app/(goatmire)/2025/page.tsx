import Link from "next/link";
import { PROGRAMMES, getAvailable, formatDuration, speakerLine, talkHref } from "@/lib/goatmire";
import { Header25 } from "@/components/goatmire/chrome";
import { Watched } from "@/components/goatmire/watched";

export const revalidate = 300;
export const metadata = {
  title: "2025",
  description: "Goatmire Elixir & NervesConf EU, 10–12 September 2025, Varbergs Teater. Every talk.",
  openGraph: { title: "Goatmire Elixir & NervesConf EU 2025", description: "10–12 September 2025, Varbergs Teater. Every talk." },
};

const SUMMARY_ID = "w73xw"; // progress key for the summary film

export default async function Index2025() {
  const videos = await getAvailable(2025);
  const summaryDuration = videos["in-summary"]?.duration ?? 390;

  return (
    <div className="y25 page25">
      <div className="curtainwash" aria-hidden />
      <Header25 />
      <section className="hero25">
        <Link href="/2025/in-summary" className="feat">
          <img src="https://uploads.eu1.boldvideo.io/uploads/bt_goatmire/thumbnails/712f9896-c97a-4dc7-b35d-c285d8a4c970.jpg" alt="Goatmire Elixir 2025, in summary" />
          <span className="play"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
          <span className="dur">{formatDuration(summaryDuration)}</span>
          <Watched videoId={SUMMARY_ID} />
        </Link>
        <div className="intro">
          <p>The conference is done.</p>
          <p>If you were there. You know what you did. You know what it was.</p>
          <p>Thank you.</p>
          <div className="meta"><span>10–12 September 2025</span><span>Varbergs Teater</span><span>{Object.keys(videos).filter((k) => k !== "in-summary").length} talks</span></div>
          <p className="featlbl"><span className="rs">In summary</span> Summarizing the lovely time we had at Goatmire Elixir 2025.</p>
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
              const inner = (
                <>
                  <span className="thumb">
                    {v?.thumbnail ? <img src={v.thumbnail} alt="" loading="lazy" /> : <span className="noimg" />}
                    {v && <span className="dur">{formatDuration(v.duration)}</span>}
                    {v && <Watched videoId={v.id} />}
                  </span>
                  <span className="t"><span className="time">{e.time}</span>{e.title}</span>
                  <span className="who">{speakerLine(e)}</span>
                </>
              );
              return v ? (
                <Link className="c25" key={i} href={talkHref(2025, e)}>{inner}</Link>
              ) : (
                <div className="c25 off" key={i}>{inner}</div>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="f25">
        <span>Goatmire Elixir &amp; NervesConf EU, 2025</span>
      </footer>
    </div>
  );
}
