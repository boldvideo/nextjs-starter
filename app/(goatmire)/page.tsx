import Link from "next/link";
import { talks } from "@/lib/goatmire";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

function countLine(n: number, total: number): React.ReactNode {
  if (n >= total) return <>All {total} talks.<br />Every word of them.</>;
  const word = WORDS[n] ?? String(n);
  return <>{word} talk{n === 1 ? "" : "s"} in.<br />The rest follow.</>;
}

export const revalidate = 300;

export default function Threshold() {
  const t25 = talks(2025);
  const t26 = talks(2026);
  const in26 = t26.filter((t) => t.videoId).length;

  return (
    <main className="th">
      <Link href="/2025" className="half h25">
        <span className="bg curtain" />
        <span className="bg spot" />
        <span className="bg neon" />
        <span className="inner">
          <span className="date">10–12 September 2025</span>
          <img src="/goatmire/logo25.svg" alt="Goatmire Elixir" className="logo" />
          <span className="ttl">The first one.</span>
          <span className="sub">Goatmire Elixir &amp; NervesConf EU<br />{t25.length} talks, sixteen hours.</span>
          <span className="go">Take your seat</span>
        </span>
      </Link>
      <span className="seam" aria-hidden />
      <Link href="/2026" className="half h26">
        <span className="bg teal" />
        <span className="bg fire" />
        <span className="inner">
          <span className="date">September 28th to October 3rd, 2026</span>
          <img src="/goatmire/logo26.svg" alt="Goatmire" className="logo" />
          <img src="/goatmire/runes26.svg" alt="ᛁᛚᛁᚴᛋᛁᛦ" className="runes" />
          <span className="ttl">The return.</span>
          <span className="sub">{countLine(in26, t26.length)}</span>
          <span className="go">Take your seat</span>
        </span>
      </Link>
      <p className="top">Recorded at Varbergs Teater, Varberg, Sweden</p>
      <footer className="foot">
        <span>Aspire. Perspire. Goatmire. .. Rewatch.</span>
        <span className="secret">The well asked an eye of the one who drank. This one asks nothing.</span>
      </footer>
    </main>
  );
}
