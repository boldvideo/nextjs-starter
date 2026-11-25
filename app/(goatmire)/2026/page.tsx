import Link from "next/link";
import { PROGRAMMES, getAvailable, formatDuration, speakerLine, talkHref } from "@/lib/goatmire";
import { Rail26 } from "@/components/goatmire/chrome";
import { WatchedWord } from "@/components/goatmire/watched";

export const revalidate = 300;
export const metadata = { title: "2026" };

export default async function Index2026() {
  const videos = await getAvailable(2026);
  const days = PROGRAMMES[2026].days;

  return (
    <div className="y26 page26">
      <div className="bg26" aria-hidden />
      <Rail26 active="Talks" />
      <div className="col">
        <div className="hero26">
          <img src="/goatmire/logo26.svg" alt="Goatmire" className="logo" />
          <img src="/goatmire/runes26.svg" alt="ᛁᛚᛁᚴᛋᛁᛦ" className="runes" />
          <p className="when">September 28th to October 3rd, 2026<br />Varberg, Sweden</p>
        </div>
        {days.map((day, di) => (
          <section key={day.id} id={day.id} className="day26">
            <p className="kicker">{day.track}</p>
            <h2>{day.title}</h2>
            <ol className="prog26">
              {day.entries.map((e, i) => {
                if (e.kind !== "talk") {
                  return (
                    <li key={i} className={`n26 ${e.kind}`}>
                      <span className="tm">{e.time}</span>
                      <span className="nt">{e.title}</span>
                    </li>
                  );
                }
                const v = videos[e.slug];
                const available = !!v;
                const photo = e.speakers[0]?.photo;
                const body = (
                  <>
                    <span className="tm">{e.time}</span>
                    <span className="ph">{photo ? <img src={photo} alt="" loading="lazy" /> : null}</span>
                    <span className="tx">
                      <span className="ti">{e.title}</span>
                      <span className="by">by {speakerLine(e)}</span>
                      {e.speakers[0]?.role && <span className="ro">{e.speakers.map((s) => s.role).filter(Boolean).join(" · ")}</span>}
                    </span>
                    <span className="d">
                      {available ? <>{formatDuration(v.duration)}<WatchedWord videoId={v.id} /></> : <em>Soon</em>}
                    </span>
                  </>
                );
                return (
                  <li key={i}>
                    {available ? (
                      <Link href={talkHref(2026, e)} className="r26">{body}</Link>
                    ) : (
                      <div className="r26 soon">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

      </div>
    </div>
  );
}
